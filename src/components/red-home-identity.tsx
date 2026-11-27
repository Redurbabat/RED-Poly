import React, {useEffect,useRef,useState} from "react";
import {Platform,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {openRedIdentity,redIdentityAvailable} from "@/lib/red-id";
import {makeThemedStyles,radius} from "@/lib/theme";

export function RedHomeIdentity(){
  const styles=useStyles();
  const [origin,setOrigin]=useState("");
  const [connected,setConnected]=useState(false);
  const [request,setRequest]=useState("");
  const [name,setName]=useState("");
  const [status,setStatus]=useState("No RED ID connection.");
  const [busy,setBusy]=useState(false);
  const current=useRef<ReturnType<typeof openRedIdentity>|null>(null);
  const locked=useRef(false);
  const live=useRef(true);
  useEffect(()=>{live.current=true;return()=>{live.current=false;current.current?.dispose();};},[]);
  const run=async(fn:()=>Promise<void>)=>{
    if(locked.current)return;locked.current=true;setBusy(true);
    try{await fn();}catch{if(live.current)setStatus("Request failed. Check your private server, approval and RED ION revocation settings.");}
    finally{locked.current=false;if(live.current)setBusy(false);}
  };
  const client=()=>{if(!current.current)current.current=openRedIdentity(origin.trim());return current.current;};
  const button=(label:string,action:()=>void,disabled=false)=><Pressable accessibilityRole="button" disabled={busy||disabled} onPress={action} style={[styles.button,(busy||disabled)&&{opacity:.5}]}><Text style={styles.buttonLabel}>{label}</Text></Pressable>;
  return <View style={styles.card}>
    <Text style={styles.title}>RED Home Server</Text>
    <Text style={styles.text}>Optional identity only. Learning progress stays local.</Text>
    {!redIdentityAvailable?<Text style={styles.text}>A native development build with RED Identity is required. Expo Go is not supported.</Text>:<>
      <TextInput style={styles.input} accessibilityLabel="Private HTTPS server" placeholder="https://your-private-server" autoCapitalize="none" autoCorrect={false} value={origin} editable={!busy&&!connected&&!request} onChangeText={v=>{current.current?.dispose();current.current=null;setOrigin(v);}}/>
      {button("Create pairing request",()=>void run(async()=>{const value=await client().begin();if(live.current){setRequest(value);setStatus("Compare and approve the public request in RED ION.");}}),!origin||!!request||connected)}
      {!!request&&<>
        <Text selectable style={styles.text}>{request}</Text>
        {button("Claim approved login",()=>void run(async()=>{const id=await client().claim();if(live.current){setName(id.name||id.id);setRequest("");setConnected(true);setStatus("RED ID connected.");}}))}
        {button("Cancel request",()=>void run(async()=>{await client().cancel();if(live.current)setRequest("");}))}
      </>}
      {button("Check existing identity",()=>void run(async()=>{const id=await client().me();if(live.current){setName(id.name||id.id);setConnected(true);setStatus("RED ID connected.");}}),!origin||!!request)}
      {connected&&<Text style={styles.title}>{name}</Text>}
      {button("Disconnect",()=>void run(async()=>{try{await client().logout();if(live.current)setStatus("Disconnected.");}finally{current.current?.dispose();current.current=null;if(live.current){setName("");setRequest("");setConnected(false);}}}),!origin)}
      {Platform.OS==="web"&&<Text style={styles.text}>Browser credentials live only in memory. Reloading signs out locally.</Text>}
      <Text accessibilityLiveRegion="polite" style={styles.text}>{status}</Text>
    </>}
  </View>;
}
const useStyles=makeThemedStyles(colors=>StyleSheet.create({
  card:{borderWidth:2,borderColor:colors.neutral200,borderRadius:radius.xl,padding:16,gap:12},
  title:{fontSize:16,fontWeight:"800",color:colors.neutral700},
  text:{fontSize:13,color:colors.textMuted},
  input:{borderWidth:1,borderColor:colors.neutral200,borderRadius:radius.lg,padding:12,color:colors.neutral700},
  button:{borderWidth:1,borderColor:colors.neutral200,borderRadius:radius.lg,padding:12},
  buttonLabel:{fontWeight:"700",color:colors.neutral700}
}));
