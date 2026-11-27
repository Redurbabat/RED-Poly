import ExpoModulesCore
import Foundation

public class RedIdentityModule: Module {
    private let state = RedIdentityBridgeState()
    public func definition() -> ModuleDefinition {
        Name("RedIdentity")
        AsyncFunction("begin") { (origin: String, promise: Promise) in
            Task { do { promise.resolve(try await self.state.begin(origin)) } catch { promise.reject("RED_ID", "Kopplung fehlgeschlagen.") } }
        }
        AsyncFunction("claim") { (origin: String, promise: Promise) in
            Task { do { promise.resolve(try await self.state.claim(origin)) } catch { promise.reject("RED_ID", "Anmeldung noch nicht freigegeben oder fehlgeschlagen.") } }
        }
        AsyncFunction("me") { (origin: String, promise: Promise) in
            Task { do { promise.resolve(try await self.state.me(origin)) } catch { promise.reject("RED_ID", "Keine bestätigte Verbindung.") } }
        }
        AsyncFunction("logout") { (origin: String, promise: Promise) in
            Task { do { try await self.state.logout(origin); promise.resolve(nil) } catch { promise.reject("RED_ID", "Remote-Abmeldung nicht bestätigt. RED ION widerrufen.") } }
        }
        AsyncFunction("cancel") { (promise: Promise) in
            Task { await self.state.cancel(); promise.resolve(nil) }
        }
    }
}
private actor RedIdentityBridgeState {
    private var client: RedNativeClient?
    private var origin: String?
    private var pending: (RedNativeProof, Date)?
    private var busy = false
    private func get(_ value: String) throws -> RedNativeClient {
        if let client, origin == value { return client }
        let next = try RedNativeClient(origin: value, app: "red-poly")
        client = next; origin = value; pending = nil; return next
    }
    private func enter() throws {
        guard !busy else { throw RedNativeError.busy }; busy = true
    }
    func begin(_ value: String) throws -> String {
        try enter(); defer { busy = false }
        _ = try get(value)
        let p = RedNativeClient.makeProof()
        pending = (p, Date().addingTimeInterval(300))
        return try RedNativeClient.pairingRequest(app: "red-poly", challenge: p.challenge)
    }
    func claim(_ value: String) async throws -> String {
        try enter(); defer { busy = false }
        let c = try get(value)
        guard let p = pending, p.1 > Date() else { pending = nil; throw RedNativeError.invalidProof }
        try await c.claimLogin(verifier: p.0.verifier)
        pending = nil
        return try await identity(c)
    }
    func me(_ value: String) async throws -> String {
        try enter(); defer { busy = false }
        return try await identity(get(value))
    }
    private func identity(_ client: RedNativeClient) async throws -> String {
        let data = try JSONEncoder().encode(await client.identity())
        guard let value = String(data: data, encoding: .utf8) else { throw RedNativeError.invalidResponse }
        return value
    }
    func logout(_ value: String) async throws {
        try enter(); defer { busy = false; pending = nil }
        try await get(value).logout()
    }
    func cancel() { if !busy { pending = nil } }
}
