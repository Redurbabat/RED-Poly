import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import { createRedBrowserIdentity } from "./browser";
type NativeBridge = {
  begin(origin: string): Promise<string>;
  claim(origin: string): Promise<string>;
  me(origin: string): Promise<string>;
  logout(origin: string): Promise<void>;
  cancel(): Promise<void>;
};
const native = Platform.OS === "web" ? null : requireOptionalNativeModule<NativeBridge>("RedIdentity");
export const redIdentityAvailable = Platform.OS === "web" || native !== null;
type Identity = { id: string; name: string };
function validate(raw: unknown): Identity {
  const v = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (v?.version !== 2 || v.app !== "red-poly" || typeof v.name !== "string" || typeof v.id !== "string" || !Array.isArray(v.scopes) || v.scopes.length !== 1 || v.scopes[0] !== "identity:read") throw new Error("Invalid RED identity");
  return {id:v.id,name:v.name};
}
export function openRedIdentity(origin: string) {
  const u = new URL(origin);
  if (u.protocol !== "https:" || u.origin !== origin) throw new Error("Exact HTTPS origin required");
  if (Platform.OS === "web") {
    const c = createRedBrowserIdentity(origin,"red-poly");
    return {begin:c.begin,claim:async()=>validate(await c.claim()),me:async()=>validate(await c.me()),logout:c.logout,cancel:async()=>c.cancel(),dispose:c.dispose};
  }
  if (!native) throw new Error("Native development build required");
  const n = native;
  return {begin:()=>n.begin(origin),claim:async()=>validate(await n.claim(origin)),me:async()=>validate(await n.me(origin)),logout:()=>n.logout(origin),cancel:()=>n.cancel(),dispose:()=>{void n.cancel().catch(()=>undefined);}};
}
