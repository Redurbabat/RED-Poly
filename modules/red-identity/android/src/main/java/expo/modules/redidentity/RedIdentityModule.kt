package expo.modules.redidentity

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import ch.red.ecosystem.identity.RedAndroidClient
import ch.red.ecosystem.identity.RedAndroidStore

class RedIdentityModule : Module() {
  private var client: RedAndroidClient? = null
  private var origin: String? = null
  private var proof: RedAndroidClient.Proof? = null
  private var expires = 0L
  private val lock = Any()
  private fun get(value: String): RedAndroidClient {
    val current = client
    if (origin == value && current != null) return current
    val context = requireNotNull(appContext.reactContext)
    val next = RedAndroidClient(value, "red-poly", RedAndroidStore(context))
    origin = value; client = next; proof = null
    return next
  }
  override fun definition() = ModuleDefinition {
    Name("RedIdentity")
    AsyncFunction("begin") { value: String -> synchronized(lock) {
      get(value)
      val next = RedAndroidClient.makeProof()
      proof = next; expires = android.os.SystemClock.elapsedRealtime() + 300000
      RedAndroidClient.pairingRequest("red-poly", next.challenge)
    } }
    AsyncFunction("claim") { value: String -> synchronized(lock) {
      val c = get(value)
      val p = requireNotNull(proof)
      check(android.os.SystemClock.elapsedRealtime() < expires)
      c.claimLogin(p.verifier); proof = null
      c.identity().toString()
    } }
    AsyncFunction("me") { value: String -> synchronized(lock) { get(value).identity().toString() } }
    AsyncFunction("logout") { value: String -> synchronized(lock) {
      try { get(value).logout() } finally { proof = null }
      Unit
    } }
    AsyncFunction("cancel") { synchronized(lock) { proof = null; Unit } }
  }
}
