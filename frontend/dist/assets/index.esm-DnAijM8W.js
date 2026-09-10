const gp=()=>{};var qc={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wh=function(r){const t=[];let e=0;for(let n=0;n<r.length;n++){let s=r.charCodeAt(n);s<128?t[e++]=s:s<2048?(t[e++]=s>>6|192,t[e++]=s&63|128):(s&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(s=65536+((s&1023)<<10)+(r.charCodeAt(++n)&1023),t[e++]=s>>18|240,t[e++]=s>>12&63|128,t[e++]=s>>6&63|128,t[e++]=s&63|128):(t[e++]=s>>12|224,t[e++]=s>>6&63|128,t[e++]=s&63|128)}return t},_p=function(r){const t=[];let e=0,n=0;for(;e<r.length;){const s=r[e++];if(s<128)t[n++]=String.fromCharCode(s);else if(s>191&&s<224){const i=r[e++];t[n++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=r[e++],o=r[e++],u=r[e++],c=((s&7)<<18|(i&63)<<12|(o&63)<<6|u&63)-65536;t[n++]=String.fromCharCode(55296+(c>>10)),t[n++]=String.fromCharCode(56320+(c&1023))}else{const i=r[e++],o=r[e++];t[n++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return t.join("")},Ah={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,t){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const e=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let s=0;s<r.length;s+=3){const i=r[s],o=s+1<r.length,u=o?r[s+1]:0,c=s+2<r.length,h=c?r[s+2]:0,f=i>>2,m=(i&3)<<4|u>>4;let g=(u&15)<<2|h>>6,w=h&63;c||(w=64,o||(g=64)),n.push(e[f],e[m],e[g],e[w])}return n.join("")},encodeString(r,t){return this.HAS_NATIVE_SUPPORT&&!t?btoa(r):this.encodeByteArray(wh(r),t)},decodeString(r,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(r):_p(this.decodeStringToByteArray(r,t))},decodeStringToByteArray(r,t){this.init_();const e=t?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let s=0;s<r.length;){const i=e[r.charAt(s++)],u=s<r.length?e[r.charAt(s)]:0;++s;const h=s<r.length?e[r.charAt(s)]:64;++s;const m=s<r.length?e[r.charAt(s)]:64;if(++s,i==null||u==null||h==null||m==null)throw new yp;const g=i<<2|u>>4;if(n.push(g),h!==64){const w=u<<4&240|h>>2;if(n.push(w),m!==64){const V=h<<6&192|m;n.push(V)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class yp extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Ip=function(r){const t=wh(r);return Ah.encodeByteArray(t,!0)},Ii=function(r){return Ip(r).replace(/\./g,"")},Ep=function(r){try{return Ah.decodeString(r,!0)}catch(t){console.error("base64Decode failed: ",t)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bh(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tp=()=>bh().__FIREBASE_DEFAULTS__,vp=()=>{if(typeof process>"u"||typeof qc>"u")return;const r=qc.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},wp=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const t=r&&Ep(r[1]);return t&&JSON.parse(t)},Bi=()=>{try{return gp()||Tp()||vp()||wp()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},Ap=r=>{var t,e;return(e=(t=Bi())===null||t===void 0?void 0:t.emulatorHosts)===null||e===void 0?void 0:e[r]},bp=r=>{const t=Ap(r);if(!t)return;const e=t.lastIndexOf(":");if(e<=0||e+1===t.length)throw new Error(`Invalid host ${t} with no separate hostname and port!`);const n=parseInt(t.substring(e+1),10);return t[0]==="["?[t.substring(1,e-1),n]:[t.substring(0,e),n]},Rh=()=>{var r;return(r=Bi())===null||r===void 0?void 0:r.config},qT=r=>{var t;return(t=Bi())===null||t===void 0?void 0:t[`_${r}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rp{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((t,e)=>{this.resolve=t,this.reject=e})}wrapCallback(t){return(e,n)=>{e?this.reject(e):this.resolve(n),typeof t=="function"&&(this.promise.catch(()=>{}),t.length===1?t(e):t(e,n))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ui(r){try{return(r.startsWith("http://")||r.startsWith("https://")?new URL(r).hostname:r).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Sh(r){return(await fetch(r,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Sp(r,t){if(r.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const e={alg:"none",type:"JWT"},n=t||"demo-project",s=r.iat||0,i=r.sub||r.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o=Object.assign({iss:`https://securetoken.google.com/${n}`,aud:n,iat:s,exp:s+3600,auth_time:s,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}}},r);return[Ii(JSON.stringify(e)),Ii(JSON.stringify(o)),""].join(".")}const Xr={};function Pp(){const r={prod:[],emulator:[]};for(const t of Object.keys(Xr))Xr[t]?r.emulator.push(t):r.prod.push(t);return r}function Vp(r){let t=document.getElementById(r),e=!1;return t||(t=document.createElement("div"),t.setAttribute("id",r),e=!0),{created:e,element:t}}let jc=!1;function Cp(r,t){if(typeof window>"u"||typeof document>"u"||!Ui(window.location.host)||Xr[r]===t||Xr[r]||jc)return;Xr[r]=t;function e(g){return`__firebase__banner__${g}`}const n="__firebase__banner",i=Pp().prod.length>0;function o(){const g=document.getElementById(n);g&&g.remove()}function u(g){g.style.display="flex",g.style.background="#7faaf0",g.style.position="fixed",g.style.bottom="5px",g.style.left="5px",g.style.padding=".5em",g.style.borderRadius="5px",g.style.alignItems="center"}function c(g,w){g.setAttribute("width","24"),g.setAttribute("id",w),g.setAttribute("height","24"),g.setAttribute("viewBox","0 0 24 24"),g.setAttribute("fill","none"),g.style.marginLeft="-6px"}function h(){const g=document.createElement("span");return g.style.cursor="pointer",g.style.marginLeft="16px",g.style.fontSize="24px",g.innerHTML=" &times;",g.onclick=()=>{jc=!0,o()},g}function f(g,w){g.setAttribute("id",w),g.innerText="Learn more",g.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",g.setAttribute("target","__blank"),g.style.paddingLeft="5px",g.style.textDecoration="underline"}function m(){const g=Vp(n),w=e("text"),V=document.getElementById(w)||document.createElement("span"),D=e("learnmore"),x=document.getElementById(D)||document.createElement("a"),L=e("preprendIcon"),q=document.getElementById(L)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(g.created){const B=g.element;u(B),f(x,D);const K=h();c(q,L),B.append(q,V,x,K),document.body.appendChild(B)}i?(V.innerText="Preview backend disconnected.",q.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(q.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,V.innerText="Preview backend running in this workspace."),V.setAttribute("id",w)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",m):m()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zn(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function jT(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(zn())}function Ph(){var r;const t=(r=Bi())===null||r===void 0?void 0:r.forceEnvironment;if(t==="node")return!0;if(t==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function zT(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function $T(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function GT(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function KT(){const r=zn();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function Vh(){return!Ph()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Ch(){return!Ph()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Dh(){try{return typeof indexedDB=="object"}catch{return!1}}function Dp(){return new Promise((r,t)=>{try{let e=!0;const n="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(n);s.onsuccess=()=>{s.result.close(),e||self.indexedDB.deleteDatabase(n),r(!0)},s.onupgradeneeded=()=>{e=!1},s.onerror=()=>{var i;t(((i=s.error)===null||i===void 0?void 0:i.message)||"")}}catch(e){t(e)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xp="FirebaseError";class hr extends Error{constructor(t,e,n){super(e),this.code=t,this.customData=n,this.name=xp,Object.setPrototypeOf(this,hr.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,xh.prototype.create)}}class xh{constructor(t,e,n){this.service=t,this.serviceName=e,this.errors=n}create(t,...e){const n=e[0]||{},s=`${this.service}/${t}`,i=this.errors[t],o=i?Np(i,n):"Error",u=`${this.serviceName}: ${o} (${s}).`;return new hr(s,u,n)}}function Np(r,t){return r.replace(kp,(e,n)=>{const s=t[n];return s!=null?String(s):`<${n}?>`})}const kp=/\{\$([^}]+)}/g;function QT(r){for(const t in r)if(Object.prototype.hasOwnProperty.call(r,t))return!1;return!0}function Ne(r,t){if(r===t)return!0;const e=Object.keys(r),n=Object.keys(t);for(const s of e){if(!n.includes(s))return!1;const i=r[s],o=t[s];if(zc(i)&&zc(o)){if(!Ne(i,o))return!1}else if(i!==o)return!1}for(const s of n)if(!e.includes(s))return!1;return!0}function zc(r){return r!==null&&typeof r=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function WT(r){const t=[];for(const[e,n]of Object.entries(r))Array.isArray(n)?n.forEach(s=>{t.push(encodeURIComponent(e)+"="+encodeURIComponent(s))}):t.push(encodeURIComponent(e)+"="+encodeURIComponent(n));return t.length?"&"+t.join("&"):""}function HT(r){const t={};return r.replace(/^\?/,"").split("&").forEach(n=>{if(n){const[s,i]=n.split("=");t[decodeURIComponent(s)]=decodeURIComponent(i)}}),t}function XT(r){const t=r.indexOf("?");if(!t)return"";const e=r.indexOf("#",t);return r.substring(t,e>0?e:void 0)}function JT(r,t){const e=new Op(r,t);return e.subscribe.bind(e)}class Op{constructor(t,e){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=e,this.task.then(()=>{t(this)}).catch(n=>{this.error(n)})}next(t){this.forEachObserver(e=>{e.next(t)})}error(t){this.forEachObserver(e=>{e.error(t)}),this.close(t)}complete(){this.forEachObserver(t=>{t.complete()}),this.close()}subscribe(t,e,n){let s;if(t===void 0&&e===void 0&&n===void 0)throw new Error("Missing Observer.");Fp(t,["next","error","complete"])?s=t:s={next:t,error:e,complete:n},s.next===void 0&&(s.next=Bo),s.error===void 0&&(s.error=Bo),s.complete===void 0&&(s.complete=Bo);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(t){this.observers===void 0||this.observers[t]===void 0||(delete this.observers[t],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(t){if(!this.finalized)for(let e=0;e<this.observers.length;e++)this.sendOne(e,t)}sendOne(t,e){this.task.then(()=>{if(this.observers!==void 0&&this.observers[t]!==void 0)try{e(this.observers[t])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(t){this.finalized||(this.finalized=!0,t!==void 0&&(this.finalError=t),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Fp(r,t){if(typeof r!="object"||r===null)return!1;for(const e of t)if(e in r&&typeof r[e]=="function")return!0;return!1}function Bo(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function It(r){return r&&r._delegate?r._delegate:r}class as{constructor(t,e,n){this.name=t,this.instanceFactory=e,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(t){return this.instantiationMode=t,this}setMultipleInstances(t){return this.multipleInstances=t,this}setServiceProps(t){return this.serviceProps=t,this}setInstanceCreatedCallback(t){return this.onInstanceCreated=t,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const en="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mp{constructor(t,e){this.name=t,this.container=e,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(t){const e=this.normalizeInstanceIdentifier(t);if(!this.instancesDeferred.has(e)){const n=new Rp;if(this.instancesDeferred.set(e,n),this.isInitialized(e)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:e});s&&n.resolve(s)}catch{}}return this.instancesDeferred.get(e).promise}getImmediate(t){var e;const n=this.normalizeInstanceIdentifier(t?.identifier),s=(e=t?.optional)!==null&&e!==void 0?e:!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(i){if(s)return null;throw i}else{if(s)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(t){if(t.name!==this.name)throw Error(`Mismatching Component ${t.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=t,!!this.shouldAutoInitialize()){if(Bp(t))try{this.getOrInitializeService({instanceIdentifier:en})}catch{}for(const[e,n]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(e);try{const i=this.getOrInitializeService({instanceIdentifier:s});n.resolve(i)}catch{}}}}clearInstance(t=en){this.instancesDeferred.delete(t),this.instancesOptions.delete(t),this.instances.delete(t)}async delete(){const t=Array.from(this.instances.values());await Promise.all([...t.filter(e=>"INTERNAL"in e).map(e=>e.INTERNAL.delete()),...t.filter(e=>"_delete"in e).map(e=>e._delete())])}isComponentSet(){return this.component!=null}isInitialized(t=en){return this.instances.has(t)}getOptions(t=en){return this.instancesOptions.get(t)||{}}initialize(t={}){const{options:e={}}=t,n=this.normalizeInstanceIdentifier(t.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:n,options:e});for(const[i,o]of this.instancesDeferred.entries()){const u=this.normalizeInstanceIdentifier(i);n===u&&o.resolve(s)}return s}onInit(t,e){var n;const s=this.normalizeInstanceIdentifier(e),i=(n=this.onInitCallbacks.get(s))!==null&&n!==void 0?n:new Set;i.add(t),this.onInitCallbacks.set(s,i);const o=this.instances.get(s);return o&&t(o,s),()=>{i.delete(t)}}invokeOnInitCallbacks(t,e){const n=this.onInitCallbacks.get(e);if(n)for(const s of n)try{s(t,e)}catch{}}getOrInitializeService({instanceIdentifier:t,options:e={}}){let n=this.instances.get(t);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:Lp(t),options:e}),this.instances.set(t,n),this.instancesOptions.set(t,e),this.invokeOnInitCallbacks(n,t),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,t,n)}catch{}return n||null}normalizeInstanceIdentifier(t=en){return this.component?this.component.multipleInstances?t:en:t}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Lp(r){return r===en?void 0:r}function Bp(r){return r.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Up{constructor(t){this.name=t,this.providers=new Map}addComponent(t){const e=this.getProvider(t.name);if(e.isComponentSet())throw new Error(`Component ${t.name} has already been registered with ${this.name}`);e.setComponent(t)}addOrOverwriteComponent(t){this.getProvider(t.name).isComponentSet()&&this.providers.delete(t.name),this.addComponent(t)}getProvider(t){if(this.providers.has(t))return this.providers.get(t);const e=new Mp(t,this);return this.providers.set(t,e),e}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var J;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(J||(J={}));const qp={debug:J.DEBUG,verbose:J.VERBOSE,info:J.INFO,warn:J.WARN,error:J.ERROR,silent:J.SILENT},jp=J.INFO,zp={[J.DEBUG]:"log",[J.VERBOSE]:"log",[J.INFO]:"info",[J.WARN]:"warn",[J.ERROR]:"error"},$p=(r,t,...e)=>{if(t<r.logLevel)return;const n=new Date().toISOString(),s=zp[t];if(s)console[s](`[${n}]  ${r.name}:`,...e);else throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`)};class Nh{constructor(t){this.name=t,this._logLevel=jp,this._logHandler=$p,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(t){if(!(t in J))throw new TypeError(`Invalid value "${t}" assigned to \`logLevel\``);this._logLevel=t}setLogLevel(t){this._logLevel=typeof t=="string"?qp[t]:t}get logHandler(){return this._logHandler}set logHandler(t){if(typeof t!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=t}get userLogHandler(){return this._userLogHandler}set userLogHandler(t){this._userLogHandler=t}debug(...t){this._userLogHandler&&this._userLogHandler(this,J.DEBUG,...t),this._logHandler(this,J.DEBUG,...t)}log(...t){this._userLogHandler&&this._userLogHandler(this,J.VERBOSE,...t),this._logHandler(this,J.VERBOSE,...t)}info(...t){this._userLogHandler&&this._userLogHandler(this,J.INFO,...t),this._logHandler(this,J.INFO,...t)}warn(...t){this._userLogHandler&&this._userLogHandler(this,J.WARN,...t),this._logHandler(this,J.WARN,...t)}error(...t){this._userLogHandler&&this._userLogHandler(this,J.ERROR,...t),this._logHandler(this,J.ERROR,...t)}}const Gp=(r,t)=>t.some(e=>r instanceof e);let $c,Gc;function Kp(){return $c||($c=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Qp(){return Gc||(Gc=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const kh=new WeakMap,Yo=new WeakMap,Oh=new WeakMap,Uo=new WeakMap,Da=new WeakMap;function Wp(r){const t=new Promise((e,n)=>{const s=()=>{r.removeEventListener("success",i),r.removeEventListener("error",o)},i=()=>{e(Ve(r.result)),s()},o=()=>{n(r.error),s()};r.addEventListener("success",i),r.addEventListener("error",o)});return t.then(e=>{e instanceof IDBCursor&&kh.set(e,r)}).catch(()=>{}),Da.set(t,r),t}function Hp(r){if(Yo.has(r))return;const t=new Promise((e,n)=>{const s=()=>{r.removeEventListener("complete",i),r.removeEventListener("error",o),r.removeEventListener("abort",o)},i=()=>{e(),s()},o=()=>{n(r.error||new DOMException("AbortError","AbortError")),s()};r.addEventListener("complete",i),r.addEventListener("error",o),r.addEventListener("abort",o)});Yo.set(r,t)}let Zo={get(r,t,e){if(r instanceof IDBTransaction){if(t==="done")return Yo.get(r);if(t==="objectStoreNames")return r.objectStoreNames||Oh.get(r);if(t==="store")return e.objectStoreNames[1]?void 0:e.objectStore(e.objectStoreNames[0])}return Ve(r[t])},set(r,t,e){return r[t]=e,!0},has(r,t){return r instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in r}};function Xp(r){Zo=r(Zo)}function Jp(r){return r===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...e){const n=r.call(qo(this),t,...e);return Oh.set(n,t.sort?t.sort():[t]),Ve(n)}:Qp().includes(r)?function(...t){return r.apply(qo(this),t),Ve(kh.get(this))}:function(...t){return Ve(r.apply(qo(this),t))}}function Yp(r){return typeof r=="function"?Jp(r):(r instanceof IDBTransaction&&Hp(r),Gp(r,Kp())?new Proxy(r,Zo):r)}function Ve(r){if(r instanceof IDBRequest)return Wp(r);if(Uo.has(r))return Uo.get(r);const t=Yp(r);return t!==r&&(Uo.set(r,t),Da.set(t,r)),t}const qo=r=>Da.get(r);function Zp(r,t,{blocked:e,upgrade:n,blocking:s,terminated:i}={}){const o=indexedDB.open(r,t),u=Ve(o);return n&&o.addEventListener("upgradeneeded",c=>{n(Ve(o.result),c.oldVersion,c.newVersion,Ve(o.transaction),c)}),e&&o.addEventListener("blocked",c=>e(c.oldVersion,c.newVersion,c)),u.then(c=>{i&&c.addEventListener("close",()=>i()),s&&c.addEventListener("versionchange",h=>s(h.oldVersion,h.newVersion,h))}).catch(()=>{}),u}const tg=["get","getKey","getAll","getAllKeys","count"],eg=["put","add","delete","clear"],jo=new Map;function Kc(r,t){if(!(r instanceof IDBDatabase&&!(t in r)&&typeof t=="string"))return;if(jo.get(t))return jo.get(t);const e=t.replace(/FromIndex$/,""),n=t!==e,s=eg.includes(e);if(!(e in(n?IDBIndex:IDBObjectStore).prototype)||!(s||tg.includes(e)))return;const i=async function(o,...u){const c=this.transaction(o,s?"readwrite":"readonly");let h=c.store;return n&&(h=h.index(u.shift())),(await Promise.all([h[e](...u),s&&c.done]))[0]};return jo.set(t,i),i}Xp(r=>({...r,get:(t,e,n)=>Kc(t,e)||r.get(t,e,n),has:(t,e)=>!!Kc(t,e)||r.has(t,e)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ng{constructor(t){this.container=t}getPlatformInfoString(){return this.container.getProviders().map(e=>{if(rg(e)){const n=e.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(e=>e).join(" ")}}function rg(r){const t=r.getComponent();return t?.type==="VERSION"}const ta="@firebase/app",Qc="0.13.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const he=new Nh("@firebase/app"),sg="@firebase/app-compat",ig="@firebase/analytics-compat",og="@firebase/analytics",ag="@firebase/app-check-compat",ug="@firebase/app-check",cg="@firebase/auth",lg="@firebase/auth-compat",hg="@firebase/database",dg="@firebase/data-connect",fg="@firebase/database-compat",mg="@firebase/functions",pg="@firebase/functions-compat",gg="@firebase/installations",_g="@firebase/installations-compat",yg="@firebase/messaging",Ig="@firebase/messaging-compat",Eg="@firebase/performance",Tg="@firebase/performance-compat",vg="@firebase/remote-config",wg="@firebase/remote-config-compat",Ag="@firebase/storage",bg="@firebase/storage-compat",Rg="@firebase/firestore",Sg="@firebase/ai",Pg="@firebase/firestore-compat",Vg="firebase",Cg="11.10.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ei="[DEFAULT]",Dg={[ta]:"fire-core",[sg]:"fire-core-compat",[og]:"fire-analytics",[ig]:"fire-analytics-compat",[ug]:"fire-app-check",[ag]:"fire-app-check-compat",[cg]:"fire-auth",[lg]:"fire-auth-compat",[hg]:"fire-rtdb",[dg]:"fire-data-connect",[fg]:"fire-rtdb-compat",[mg]:"fire-fn",[pg]:"fire-fn-compat",[gg]:"fire-iid",[_g]:"fire-iid-compat",[yg]:"fire-fcm",[Ig]:"fire-fcm-compat",[Eg]:"fire-perf",[Tg]:"fire-perf-compat",[vg]:"fire-rc",[wg]:"fire-rc-compat",[Ag]:"fire-gcs",[bg]:"fire-gcs-compat",[Rg]:"fire-fst",[Pg]:"fire-fst-compat",[Sg]:"fire-vertex","fire-js":"fire-js",[Vg]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ti=new Map,xg=new Map,ea=new Map;function Wc(r,t){try{r.container.addComponent(t)}catch(e){he.debug(`Component ${t.name} failed to register with FirebaseApp ${r.name}`,e)}}function vi(r){const t=r.name;if(ea.has(t))return he.debug(`There were multiple attempts to register component ${t}.`),!1;ea.set(t,r);for(const e of Ti.values())Wc(e,r);for(const e of xg.values())Wc(e,r);return!0}function xa(r,t){const e=r.container.getProvider("heartbeat").getImmediate({optional:!0});return e&&e.triggerHeartbeat(),r.container.getProvider(t)}function Ng(r,t,e=Ei){xa(r,t).clearInstance(e)}function kg(r){return r==null?!1:r.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Og={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Ce=new xh("app","Firebase",Og);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fg{constructor(t,e,n){this._isDeleted=!1,this._options=Object.assign({},t),this._config=Object.assign({},e),this._name=e.name,this._automaticDataCollectionEnabled=e.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new as("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(t){this.checkDestroyed(),this._automaticDataCollectionEnabled=t}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(t){this._isDeleted=t}checkDestroyed(){if(this.isDeleted)throw Ce.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mg=Cg;function Lg(r,t={}){let e=r;typeof t!="object"&&(t={name:t});const n=Object.assign({name:Ei,automaticDataCollectionEnabled:!0},t),s=n.name;if(typeof s!="string"||!s)throw Ce.create("bad-app-name",{appName:String(s)});if(e||(e=Rh()),!e)throw Ce.create("no-options");const i=Ti.get(s);if(i){if(Ne(e,i.options)&&Ne(n,i.config))return i;throw Ce.create("duplicate-app",{appName:s})}const o=new Up(s);for(const c of ea.values())o.addComponent(c);const u=new Fg(e,n,o);return Ti.set(s,u),u}function Bg(r=Ei){const t=Ti.get(r);if(!t&&r===Ei&&Rh())return Lg();if(!t)throw Ce.create("no-app",{appName:r});return t}function Jr(r,t,e){var n;let s=(n=Dg[r])!==null&&n!==void 0?n:r;e&&(s+=`-${e}`);const i=s.match(/\s|\//),o=t.match(/\s|\//);if(i||o){const u=[`Unable to register library "${s}" with version "${t}":`];i&&u.push(`library name "${s}" contains illegal characters (whitespace or "/")`),i&&o&&u.push("and"),o&&u.push(`version name "${t}" contains illegal characters (whitespace or "/")`),he.warn(u.join(" "));return}vi(new as(`${s}-version`,()=>({library:s,version:t}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ug="firebase-heartbeat-database",qg=1,us="firebase-heartbeat-store";let zo=null;function Fh(){return zo||(zo=Zp(Ug,qg,{upgrade:(r,t)=>{switch(t){case 0:try{r.createObjectStore(us)}catch(e){console.warn(e)}}}}).catch(r=>{throw Ce.create("idb-open",{originalErrorMessage:r.message})})),zo}async function jg(r){try{const e=(await Fh()).transaction(us),n=await e.objectStore(us).get(Mh(r));return await e.done,n}catch(t){if(t instanceof hr)he.warn(t.message);else{const e=Ce.create("idb-get",{originalErrorMessage:t?.message});he.warn(e.message)}}}async function Hc(r,t){try{const n=(await Fh()).transaction(us,"readwrite");await n.objectStore(us).put(t,Mh(r)),await n.done}catch(e){if(e instanceof hr)he.warn(e.message);else{const n=Ce.create("idb-set",{originalErrorMessage:e?.message});he.warn(n.message)}}}function Mh(r){return`${r.name}!${r.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zg=1024,$g=30;class Gg{constructor(t){this.container=t,this._heartbeatsCache=null;const e=this.container.getProvider("app").getImmediate();this._storage=new Qg(e),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){var t,e;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),i=Xc();if(((t=this._heartbeatsCache)===null||t===void 0?void 0:t.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===i||this._heartbeatsCache.heartbeats.some(o=>o.date===i))return;if(this._heartbeatsCache.heartbeats.push({date:i,agent:s}),this._heartbeatsCache.heartbeats.length>$g){const o=Wg(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(n){he.warn(n)}}async getHeartbeatsHeader(){var t;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((t=this._heartbeatsCache)===null||t===void 0?void 0:t.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const e=Xc(),{heartbeatsToSend:n,unsentEntries:s}=Kg(this._heartbeatsCache.heartbeats),i=Ii(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=e,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(e){return he.warn(e),""}}}function Xc(){return new Date().toISOString().substring(0,10)}function Kg(r,t=zg){const e=[];let n=r.slice();for(const s of r){const i=e.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),Jc(e)>t){i.dates.pop();break}}else if(e.push({agent:s.agent,dates:[s.date]}),Jc(e)>t){e.pop();break}n=n.slice(1)}return{heartbeatsToSend:e,unsentEntries:n}}class Qg{constructor(t){this.app=t,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Dh()?Dp().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const e=await jg(this.app);return e?.heartbeats?e:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(t){var e;if(await this._canUseIndexedDBPromise){const s=await this.read();return Hc(this.app,{lastSentHeartbeatDate:(e=t.lastSentHeartbeatDate)!==null&&e!==void 0?e:s.lastSentHeartbeatDate,heartbeats:t.heartbeats})}else return}async add(t){var e;if(await this._canUseIndexedDBPromise){const s=await this.read();return Hc(this.app,{lastSentHeartbeatDate:(e=t.lastSentHeartbeatDate)!==null&&e!==void 0?e:s.lastSentHeartbeatDate,heartbeats:[...s.heartbeats,...t.heartbeats]})}else return}}function Jc(r){return Ii(JSON.stringify({version:2,heartbeats:r})).length}function Wg(r){if(r.length===0)return-1;let t=0,e=r[0].date;for(let n=1;n<r.length;n++)r[n].date<e&&(e=r[n].date,t=n);return t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hg(r){vi(new as("platform-logger",t=>new ng(t),"PRIVATE")),vi(new as("heartbeat",t=>new Gg(t),"PRIVATE")),Jr(ta,Qc,r),Jr(ta,Qc,"esm2017"),Jr("fire-js","")}Hg("");var Yc=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var De,Lh;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function t(E,_){function I(){}I.prototype=_.prototype,E.D=_.prototype,E.prototype=new I,E.prototype.constructor=E,E.C=function(T,v,S){for(var y=Array(arguments.length-2),oe=2;oe<arguments.length;oe++)y[oe-2]=arguments[oe];return _.prototype[v].apply(T,y)}}function e(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}t(n,e),n.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(E,_,I){I||(I=0);var T=Array(16);if(typeof _=="string")for(var v=0;16>v;++v)T[v]=_.charCodeAt(I++)|_.charCodeAt(I++)<<8|_.charCodeAt(I++)<<16|_.charCodeAt(I++)<<24;else for(v=0;16>v;++v)T[v]=_[I++]|_[I++]<<8|_[I++]<<16|_[I++]<<24;_=E.g[0],I=E.g[1],v=E.g[2];var S=E.g[3],y=_+(S^I&(v^S))+T[0]+3614090360&4294967295;_=I+(y<<7&4294967295|y>>>25),y=S+(v^_&(I^v))+T[1]+3905402710&4294967295,S=_+(y<<12&4294967295|y>>>20),y=v+(I^S&(_^I))+T[2]+606105819&4294967295,v=S+(y<<17&4294967295|y>>>15),y=I+(_^v&(S^_))+T[3]+3250441966&4294967295,I=v+(y<<22&4294967295|y>>>10),y=_+(S^I&(v^S))+T[4]+4118548399&4294967295,_=I+(y<<7&4294967295|y>>>25),y=S+(v^_&(I^v))+T[5]+1200080426&4294967295,S=_+(y<<12&4294967295|y>>>20),y=v+(I^S&(_^I))+T[6]+2821735955&4294967295,v=S+(y<<17&4294967295|y>>>15),y=I+(_^v&(S^_))+T[7]+4249261313&4294967295,I=v+(y<<22&4294967295|y>>>10),y=_+(S^I&(v^S))+T[8]+1770035416&4294967295,_=I+(y<<7&4294967295|y>>>25),y=S+(v^_&(I^v))+T[9]+2336552879&4294967295,S=_+(y<<12&4294967295|y>>>20),y=v+(I^S&(_^I))+T[10]+4294925233&4294967295,v=S+(y<<17&4294967295|y>>>15),y=I+(_^v&(S^_))+T[11]+2304563134&4294967295,I=v+(y<<22&4294967295|y>>>10),y=_+(S^I&(v^S))+T[12]+1804603682&4294967295,_=I+(y<<7&4294967295|y>>>25),y=S+(v^_&(I^v))+T[13]+4254626195&4294967295,S=_+(y<<12&4294967295|y>>>20),y=v+(I^S&(_^I))+T[14]+2792965006&4294967295,v=S+(y<<17&4294967295|y>>>15),y=I+(_^v&(S^_))+T[15]+1236535329&4294967295,I=v+(y<<22&4294967295|y>>>10),y=_+(v^S&(I^v))+T[1]+4129170786&4294967295,_=I+(y<<5&4294967295|y>>>27),y=S+(I^v&(_^I))+T[6]+3225465664&4294967295,S=_+(y<<9&4294967295|y>>>23),y=v+(_^I&(S^_))+T[11]+643717713&4294967295,v=S+(y<<14&4294967295|y>>>18),y=I+(S^_&(v^S))+T[0]+3921069994&4294967295,I=v+(y<<20&4294967295|y>>>12),y=_+(v^S&(I^v))+T[5]+3593408605&4294967295,_=I+(y<<5&4294967295|y>>>27),y=S+(I^v&(_^I))+T[10]+38016083&4294967295,S=_+(y<<9&4294967295|y>>>23),y=v+(_^I&(S^_))+T[15]+3634488961&4294967295,v=S+(y<<14&4294967295|y>>>18),y=I+(S^_&(v^S))+T[4]+3889429448&4294967295,I=v+(y<<20&4294967295|y>>>12),y=_+(v^S&(I^v))+T[9]+568446438&4294967295,_=I+(y<<5&4294967295|y>>>27),y=S+(I^v&(_^I))+T[14]+3275163606&4294967295,S=_+(y<<9&4294967295|y>>>23),y=v+(_^I&(S^_))+T[3]+4107603335&4294967295,v=S+(y<<14&4294967295|y>>>18),y=I+(S^_&(v^S))+T[8]+1163531501&4294967295,I=v+(y<<20&4294967295|y>>>12),y=_+(v^S&(I^v))+T[13]+2850285829&4294967295,_=I+(y<<5&4294967295|y>>>27),y=S+(I^v&(_^I))+T[2]+4243563512&4294967295,S=_+(y<<9&4294967295|y>>>23),y=v+(_^I&(S^_))+T[7]+1735328473&4294967295,v=S+(y<<14&4294967295|y>>>18),y=I+(S^_&(v^S))+T[12]+2368359562&4294967295,I=v+(y<<20&4294967295|y>>>12),y=_+(I^v^S)+T[5]+4294588738&4294967295,_=I+(y<<4&4294967295|y>>>28),y=S+(_^I^v)+T[8]+2272392833&4294967295,S=_+(y<<11&4294967295|y>>>21),y=v+(S^_^I)+T[11]+1839030562&4294967295,v=S+(y<<16&4294967295|y>>>16),y=I+(v^S^_)+T[14]+4259657740&4294967295,I=v+(y<<23&4294967295|y>>>9),y=_+(I^v^S)+T[1]+2763975236&4294967295,_=I+(y<<4&4294967295|y>>>28),y=S+(_^I^v)+T[4]+1272893353&4294967295,S=_+(y<<11&4294967295|y>>>21),y=v+(S^_^I)+T[7]+4139469664&4294967295,v=S+(y<<16&4294967295|y>>>16),y=I+(v^S^_)+T[10]+3200236656&4294967295,I=v+(y<<23&4294967295|y>>>9),y=_+(I^v^S)+T[13]+681279174&4294967295,_=I+(y<<4&4294967295|y>>>28),y=S+(_^I^v)+T[0]+3936430074&4294967295,S=_+(y<<11&4294967295|y>>>21),y=v+(S^_^I)+T[3]+3572445317&4294967295,v=S+(y<<16&4294967295|y>>>16),y=I+(v^S^_)+T[6]+76029189&4294967295,I=v+(y<<23&4294967295|y>>>9),y=_+(I^v^S)+T[9]+3654602809&4294967295,_=I+(y<<4&4294967295|y>>>28),y=S+(_^I^v)+T[12]+3873151461&4294967295,S=_+(y<<11&4294967295|y>>>21),y=v+(S^_^I)+T[15]+530742520&4294967295,v=S+(y<<16&4294967295|y>>>16),y=I+(v^S^_)+T[2]+3299628645&4294967295,I=v+(y<<23&4294967295|y>>>9),y=_+(v^(I|~S))+T[0]+4096336452&4294967295,_=I+(y<<6&4294967295|y>>>26),y=S+(I^(_|~v))+T[7]+1126891415&4294967295,S=_+(y<<10&4294967295|y>>>22),y=v+(_^(S|~I))+T[14]+2878612391&4294967295,v=S+(y<<15&4294967295|y>>>17),y=I+(S^(v|~_))+T[5]+4237533241&4294967295,I=v+(y<<21&4294967295|y>>>11),y=_+(v^(I|~S))+T[12]+1700485571&4294967295,_=I+(y<<6&4294967295|y>>>26),y=S+(I^(_|~v))+T[3]+2399980690&4294967295,S=_+(y<<10&4294967295|y>>>22),y=v+(_^(S|~I))+T[10]+4293915773&4294967295,v=S+(y<<15&4294967295|y>>>17),y=I+(S^(v|~_))+T[1]+2240044497&4294967295,I=v+(y<<21&4294967295|y>>>11),y=_+(v^(I|~S))+T[8]+1873313359&4294967295,_=I+(y<<6&4294967295|y>>>26),y=S+(I^(_|~v))+T[15]+4264355552&4294967295,S=_+(y<<10&4294967295|y>>>22),y=v+(_^(S|~I))+T[6]+2734768916&4294967295,v=S+(y<<15&4294967295|y>>>17),y=I+(S^(v|~_))+T[13]+1309151649&4294967295,I=v+(y<<21&4294967295|y>>>11),y=_+(v^(I|~S))+T[4]+4149444226&4294967295,_=I+(y<<6&4294967295|y>>>26),y=S+(I^(_|~v))+T[11]+3174756917&4294967295,S=_+(y<<10&4294967295|y>>>22),y=v+(_^(S|~I))+T[2]+718787259&4294967295,v=S+(y<<15&4294967295|y>>>17),y=I+(S^(v|~_))+T[9]+3951481745&4294967295,E.g[0]=E.g[0]+_&4294967295,E.g[1]=E.g[1]+(v+(y<<21&4294967295|y>>>11))&4294967295,E.g[2]=E.g[2]+v&4294967295,E.g[3]=E.g[3]+S&4294967295}n.prototype.u=function(E,_){_===void 0&&(_=E.length);for(var I=_-this.blockSize,T=this.B,v=this.h,S=0;S<_;){if(v==0)for(;S<=I;)s(this,E,S),S+=this.blockSize;if(typeof E=="string"){for(;S<_;)if(T[v++]=E.charCodeAt(S++),v==this.blockSize){s(this,T),v=0;break}}else for(;S<_;)if(T[v++]=E[S++],v==this.blockSize){s(this,T),v=0;break}}this.h=v,this.o+=_},n.prototype.v=function(){var E=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);E[0]=128;for(var _=1;_<E.length-8;++_)E[_]=0;var I=8*this.o;for(_=E.length-8;_<E.length;++_)E[_]=I&255,I/=256;for(this.u(E),E=Array(16),_=I=0;4>_;++_)for(var T=0;32>T;T+=8)E[I++]=this.g[_]>>>T&255;return E};function i(E,_){var I=u;return Object.prototype.hasOwnProperty.call(I,E)?I[E]:I[E]=_(E)}function o(E,_){this.h=_;for(var I=[],T=!0,v=E.length-1;0<=v;v--){var S=E[v]|0;T&&S==_||(I[v]=S,T=!1)}this.g=I}var u={};function c(E){return-128<=E&&128>E?i(E,function(_){return new o([_|0],0>_?-1:0)}):new o([E|0],0>E?-1:0)}function h(E){if(isNaN(E)||!isFinite(E))return m;if(0>E)return x(h(-E));for(var _=[],I=1,T=0;E>=I;T++)_[T]=E/I|0,I*=4294967296;return new o(_,0)}function f(E,_){if(E.length==0)throw Error("number format error: empty string");if(_=_||10,2>_||36<_)throw Error("radix out of range: "+_);if(E.charAt(0)=="-")return x(f(E.substring(1),_));if(0<=E.indexOf("-"))throw Error('number format error: interior "-" character');for(var I=h(Math.pow(_,8)),T=m,v=0;v<E.length;v+=8){var S=Math.min(8,E.length-v),y=parseInt(E.substring(v,v+S),_);8>S?(S=h(Math.pow(_,S)),T=T.j(S).add(h(y))):(T=T.j(I),T=T.add(h(y)))}return T}var m=c(0),g=c(1),w=c(16777216);r=o.prototype,r.m=function(){if(D(this))return-x(this).m();for(var E=0,_=1,I=0;I<this.g.length;I++){var T=this.i(I);E+=(0<=T?T:4294967296+T)*_,_*=4294967296}return E},r.toString=function(E){if(E=E||10,2>E||36<E)throw Error("radix out of range: "+E);if(V(this))return"0";if(D(this))return"-"+x(this).toString(E);for(var _=h(Math.pow(E,6)),I=this,T="";;){var v=K(I,_).g;I=L(I,v.j(_));var S=((0<I.g.length?I.g[0]:I.h)>>>0).toString(E);if(I=v,V(I))return S+T;for(;6>S.length;)S="0"+S;T=S+T}},r.i=function(E){return 0>E?0:E<this.g.length?this.g[E]:this.h};function V(E){if(E.h!=0)return!1;for(var _=0;_<E.g.length;_++)if(E.g[_]!=0)return!1;return!0}function D(E){return E.h==-1}r.l=function(E){return E=L(this,E),D(E)?-1:V(E)?0:1};function x(E){for(var _=E.g.length,I=[],T=0;T<_;T++)I[T]=~E.g[T];return new o(I,~E.h).add(g)}r.abs=function(){return D(this)?x(this):this},r.add=function(E){for(var _=Math.max(this.g.length,E.g.length),I=[],T=0,v=0;v<=_;v++){var S=T+(this.i(v)&65535)+(E.i(v)&65535),y=(S>>>16)+(this.i(v)>>>16)+(E.i(v)>>>16);T=y>>>16,S&=65535,y&=65535,I[v]=y<<16|S}return new o(I,I[I.length-1]&-2147483648?-1:0)};function L(E,_){return E.add(x(_))}r.j=function(E){if(V(this)||V(E))return m;if(D(this))return D(E)?x(this).j(x(E)):x(x(this).j(E));if(D(E))return x(this.j(x(E)));if(0>this.l(w)&&0>E.l(w))return h(this.m()*E.m());for(var _=this.g.length+E.g.length,I=[],T=0;T<2*_;T++)I[T]=0;for(T=0;T<this.g.length;T++)for(var v=0;v<E.g.length;v++){var S=this.i(T)>>>16,y=this.i(T)&65535,oe=E.i(v)>>>16,Ar=E.i(v)&65535;I[2*T+2*v]+=y*Ar,q(I,2*T+2*v),I[2*T+2*v+1]+=S*Ar,q(I,2*T+2*v+1),I[2*T+2*v+1]+=y*oe,q(I,2*T+2*v+1),I[2*T+2*v+2]+=S*oe,q(I,2*T+2*v+2)}for(T=0;T<_;T++)I[T]=I[2*T+1]<<16|I[2*T];for(T=_;T<2*_;T++)I[T]=0;return new o(I,0)};function q(E,_){for(;(E[_]&65535)!=E[_];)E[_+1]+=E[_]>>>16,E[_]&=65535,_++}function B(E,_){this.g=E,this.h=_}function K(E,_){if(V(_))throw Error("division by zero");if(V(E))return new B(m,m);if(D(E))return _=K(x(E),_),new B(x(_.g),x(_.h));if(D(_))return _=K(E,x(_)),new B(x(_.g),_.h);if(30<E.g.length){if(D(E)||D(_))throw Error("slowDivide_ only works with positive integers.");for(var I=g,T=_;0>=T.l(E);)I=tt(I),T=tt(T);var v=G(I,1),S=G(T,1);for(T=G(T,2),I=G(I,2);!V(T);){var y=S.add(T);0>=y.l(E)&&(v=v.add(I),S=y),T=G(T,1),I=G(I,1)}return _=L(E,v.j(_)),new B(v,_)}for(v=m;0<=E.l(_);){for(I=Math.max(1,Math.floor(E.m()/_.m())),T=Math.ceil(Math.log(I)/Math.LN2),T=48>=T?1:Math.pow(2,T-48),S=h(I),y=S.j(_);D(y)||0<y.l(E);)I-=T,S=h(I),y=S.j(_);V(S)&&(S=g),v=v.add(S),E=L(E,y)}return new B(v,E)}r.A=function(E){return K(this,E).h},r.and=function(E){for(var _=Math.max(this.g.length,E.g.length),I=[],T=0;T<_;T++)I[T]=this.i(T)&E.i(T);return new o(I,this.h&E.h)},r.or=function(E){for(var _=Math.max(this.g.length,E.g.length),I=[],T=0;T<_;T++)I[T]=this.i(T)|E.i(T);return new o(I,this.h|E.h)},r.xor=function(E){for(var _=Math.max(this.g.length,E.g.length),I=[],T=0;T<_;T++)I[T]=this.i(T)^E.i(T);return new o(I,this.h^E.h)};function tt(E){for(var _=E.g.length+1,I=[],T=0;T<_;T++)I[T]=E.i(T)<<1|E.i(T-1)>>>31;return new o(I,E.h)}function G(E,_){var I=_>>5;_%=32;for(var T=E.g.length-I,v=[],S=0;S<T;S++)v[S]=0<_?E.i(S+I)>>>_|E.i(S+I+1)<<32-_:E.i(S+I);return new o(v,E.h)}n.prototype.digest=n.prototype.v,n.prototype.reset=n.prototype.s,n.prototype.update=n.prototype.u,Lh=n,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.A,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=h,o.fromString=f,De=o}).apply(typeof Yc<"u"?Yc:typeof self<"u"?self:typeof window<"u"?window:{});var ei=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Bh,Kr,Uh,ci,na,qh,jh,zh;(function(){var r,t=typeof Object.defineProperties=="function"?Object.defineProperty:function(a,l,d){return a==Array.prototype||a==Object.prototype||(a[l]=d.value),a};function e(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof ei=="object"&&ei];for(var l=0;l<a.length;++l){var d=a[l];if(d&&d.Math==Math)return d}throw Error("Cannot find global object")}var n=e(this);function s(a,l){if(l)t:{var d=n;a=a.split(".");for(var p=0;p<a.length-1;p++){var b=a[p];if(!(b in d))break t;d=d[b]}a=a[a.length-1],p=d[a],l=l(p),l!=p&&l!=null&&t(d,a,{configurable:!0,writable:!0,value:l})}}function i(a,l){a instanceof String&&(a+="");var d=0,p=!1,b={next:function(){if(!p&&d<a.length){var P=d++;return{value:l(P,a[P]),done:!1}}return p=!0,{done:!0,value:void 0}}};return b[Symbol.iterator]=function(){return b},b}s("Array.prototype.values",function(a){return a||function(){return i(this,function(l,d){return d})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var o=o||{},u=this||self;function c(a){var l=typeof a;return l=l!="object"?l:a?Array.isArray(a)?"array":l:"null",l=="array"||l=="object"&&typeof a.length=="number"}function h(a){var l=typeof a;return l=="object"&&a!=null||l=="function"}function f(a,l,d){return a.call.apply(a.bind,arguments)}function m(a,l,d){if(!a)throw Error();if(2<arguments.length){var p=Array.prototype.slice.call(arguments,2);return function(){var b=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(b,p),a.apply(l,b)}}return function(){return a.apply(l,arguments)}}function g(a,l,d){return g=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?f:m,g.apply(null,arguments)}function w(a,l){var d=Array.prototype.slice.call(arguments,1);return function(){var p=d.slice();return p.push.apply(p,arguments),a.apply(this,p)}}function V(a,l){function d(){}d.prototype=l.prototype,a.aa=l.prototype,a.prototype=new d,a.prototype.constructor=a,a.Qb=function(p,b,P){for(var F=Array(arguments.length-2),it=2;it<arguments.length;it++)F[it-2]=arguments[it];return l.prototype[b].apply(p,F)}}function D(a){const l=a.length;if(0<l){const d=Array(l);for(let p=0;p<l;p++)d[p]=a[p];return d}return[]}function x(a,l){for(let d=1;d<arguments.length;d++){const p=arguments[d];if(c(p)){const b=a.length||0,P=p.length||0;a.length=b+P;for(let F=0;F<P;F++)a[b+F]=p[F]}else a.push(p)}}class L{constructor(l,d){this.i=l,this.j=d,this.h=0,this.g=null}get(){let l;return 0<this.h?(this.h--,l=this.g,this.g=l.next,l.next=null):l=this.i(),l}}function q(a){return/^[\s\xa0]*$/.test(a)}function B(){var a=u.navigator;return a&&(a=a.userAgent)?a:""}function K(a){return K[" "](a),a}K[" "]=function(){};var tt=B().indexOf("Gecko")!=-1&&!(B().toLowerCase().indexOf("webkit")!=-1&&B().indexOf("Edge")==-1)&&!(B().indexOf("Trident")!=-1||B().indexOf("MSIE")!=-1)&&B().indexOf("Edge")==-1;function G(a,l,d){for(const p in a)l.call(d,a[p],p,a)}function E(a,l){for(const d in a)l.call(void 0,a[d],d,a)}function _(a){const l={};for(const d in a)l[d]=a[d];return l}const I="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function T(a,l){let d,p;for(let b=1;b<arguments.length;b++){p=arguments[b];for(d in p)a[d]=p[d];for(let P=0;P<I.length;P++)d=I[P],Object.prototype.hasOwnProperty.call(p,d)&&(a[d]=p[d])}}function v(a){var l=1;a=a.split(":");const d=[];for(;0<l&&a.length;)d.push(a.shift()),l--;return a.length&&d.push(a.join(":")),d}function S(a){u.setTimeout(()=>{throw a},0)}function y(){var a=po;let l=null;return a.g&&(l=a.g,a.g=a.g.next,a.g||(a.h=null),l.next=null),l}class oe{constructor(){this.h=this.g=null}add(l,d){const p=Ar.get();p.set(l,d),this.h?this.h.next=p:this.g=p,this.h=p}}var Ar=new L(()=>new Om,a=>a.reset());class Om{constructor(){this.next=this.g=this.h=null}set(l,d){this.h=l,this.g=d,this.next=null}reset(){this.next=this.g=this.h=null}}let br,Rr=!1,po=new oe,qu=()=>{const a=u.Promise.resolve(void 0);br=()=>{a.then(Fm)}};var Fm=()=>{for(var a;a=y();){try{a.h.call(a.g)}catch(d){S(d)}var l=Ar;l.j(a),100>l.h&&(l.h++,a.next=l.g,l.g=a)}Rr=!1};function ye(){this.s=this.s,this.C=this.C}ye.prototype.s=!1,ye.prototype.ma=function(){this.s||(this.s=!0,this.N())},ye.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function Pt(a,l){this.type=a,this.g=this.target=l,this.defaultPrevented=!1}Pt.prototype.h=function(){this.defaultPrevented=!0};var Mm=function(){if(!u.addEventListener||!Object.defineProperty)return!1;var a=!1,l=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const d=()=>{};u.addEventListener("test",d,l),u.removeEventListener("test",d,l)}catch{}return a}();function Sr(a,l){if(Pt.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a){var d=this.type=a.type,p=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;if(this.target=a.target||a.srcElement,this.g=l,l=a.relatedTarget){if(tt){t:{try{K(l.nodeName);var b=!0;break t}catch{}b=!1}b||(l=null)}}else d=="mouseover"?l=a.fromElement:d=="mouseout"&&(l=a.toElement);this.relatedTarget=l,p?(this.clientX=p.clientX!==void 0?p.clientX:p.pageX,this.clientY=p.clientY!==void 0?p.clientY:p.pageY,this.screenX=p.screenX||0,this.screenY=p.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=typeof a.pointerType=="string"?a.pointerType:Lm[a.pointerType]||"",this.state=a.state,this.i=a,a.defaultPrevented&&Sr.aa.h.call(this)}}V(Sr,Pt);var Lm={2:"touch",3:"pen",4:"mouse"};Sr.prototype.h=function(){Sr.aa.h.call(this);var a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var Fs="closure_listenable_"+(1e6*Math.random()|0),Bm=0;function Um(a,l,d,p,b){this.listener=a,this.proxy=null,this.src=l,this.type=d,this.capture=!!p,this.ha=b,this.key=++Bm,this.da=this.fa=!1}function Ms(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function Ls(a){this.src=a,this.g={},this.h=0}Ls.prototype.add=function(a,l,d,p,b){var P=a.toString();a=this.g[P],a||(a=this.g[P]=[],this.h++);var F=_o(a,l,p,b);return-1<F?(l=a[F],d||(l.fa=!1)):(l=new Um(l,this.src,P,!!p,b),l.fa=d,a.push(l)),l};function go(a,l){var d=l.type;if(d in a.g){var p=a.g[d],b=Array.prototype.indexOf.call(p,l,void 0),P;(P=0<=b)&&Array.prototype.splice.call(p,b,1),P&&(Ms(l),a.g[d].length==0&&(delete a.g[d],a.h--))}}function _o(a,l,d,p){for(var b=0;b<a.length;++b){var P=a[b];if(!P.da&&P.listener==l&&P.capture==!!d&&P.ha==p)return b}return-1}var yo="closure_lm_"+(1e6*Math.random()|0),Io={};function ju(a,l,d,p,b){if(Array.isArray(l)){for(var P=0;P<l.length;P++)ju(a,l[P],d,p,b);return null}return d=Gu(d),a&&a[Fs]?a.K(l,d,h(p)?!!p.capture:!1,b):qm(a,l,d,!1,p,b)}function qm(a,l,d,p,b,P){if(!l)throw Error("Invalid event type");var F=h(b)?!!b.capture:!!b,it=To(a);if(it||(a[yo]=it=new Ls(a)),d=it.add(l,d,p,F,P),d.proxy)return d;if(p=jm(),d.proxy=p,p.src=a,p.listener=d,a.addEventListener)Mm||(b=F),b===void 0&&(b=!1),a.addEventListener(l.toString(),p,b);else if(a.attachEvent)a.attachEvent($u(l.toString()),p);else if(a.addListener&&a.removeListener)a.addListener(p);else throw Error("addEventListener and attachEvent are unavailable.");return d}function jm(){function a(d){return l.call(a.src,a.listener,d)}const l=zm;return a}function zu(a,l,d,p,b){if(Array.isArray(l))for(var P=0;P<l.length;P++)zu(a,l[P],d,p,b);else p=h(p)?!!p.capture:!!p,d=Gu(d),a&&a[Fs]?(a=a.i,l=String(l).toString(),l in a.g&&(P=a.g[l],d=_o(P,d,p,b),-1<d&&(Ms(P[d]),Array.prototype.splice.call(P,d,1),P.length==0&&(delete a.g[l],a.h--)))):a&&(a=To(a))&&(l=a.g[l.toString()],a=-1,l&&(a=_o(l,d,p,b)),(d=-1<a?l[a]:null)&&Eo(d))}function Eo(a){if(typeof a!="number"&&a&&!a.da){var l=a.src;if(l&&l[Fs])go(l.i,a);else{var d=a.type,p=a.proxy;l.removeEventListener?l.removeEventListener(d,p,a.capture):l.detachEvent?l.detachEvent($u(d),p):l.addListener&&l.removeListener&&l.removeListener(p),(d=To(l))?(go(d,a),d.h==0&&(d.src=null,l[yo]=null)):Ms(a)}}}function $u(a){return a in Io?Io[a]:Io[a]="on"+a}function zm(a,l){if(a.da)a=!0;else{l=new Sr(l,this);var d=a.listener,p=a.ha||a.src;a.fa&&Eo(a),a=d.call(p,l)}return a}function To(a){return a=a[yo],a instanceof Ls?a:null}var vo="__closure_events_fn_"+(1e9*Math.random()>>>0);function Gu(a){return typeof a=="function"?a:(a[vo]||(a[vo]=function(l){return a.handleEvent(l)}),a[vo])}function Vt(){ye.call(this),this.i=new Ls(this),this.M=this,this.F=null}V(Vt,ye),Vt.prototype[Fs]=!0,Vt.prototype.removeEventListener=function(a,l,d,p){zu(this,a,l,d,p)};function Mt(a,l){var d,p=a.F;if(p)for(d=[];p;p=p.F)d.push(p);if(a=a.M,p=l.type||l,typeof l=="string")l=new Pt(l,a);else if(l instanceof Pt)l.target=l.target||a;else{var b=l;l=new Pt(p,a),T(l,b)}if(b=!0,d)for(var P=d.length-1;0<=P;P--){var F=l.g=d[P];b=Bs(F,p,!0,l)&&b}if(F=l.g=a,b=Bs(F,p,!0,l)&&b,b=Bs(F,p,!1,l)&&b,d)for(P=0;P<d.length;P++)F=l.g=d[P],b=Bs(F,p,!1,l)&&b}Vt.prototype.N=function(){if(Vt.aa.N.call(this),this.i){var a=this.i,l;for(l in a.g){for(var d=a.g[l],p=0;p<d.length;p++)Ms(d[p]);delete a.g[l],a.h--}}this.F=null},Vt.prototype.K=function(a,l,d,p){return this.i.add(String(a),l,!1,d,p)},Vt.prototype.L=function(a,l,d,p){return this.i.add(String(a),l,!0,d,p)};function Bs(a,l,d,p){if(l=a.i.g[String(l)],!l)return!0;l=l.concat();for(var b=!0,P=0;P<l.length;++P){var F=l[P];if(F&&!F.da&&F.capture==d){var it=F.listener,bt=F.ha||F.src;F.fa&&go(a.i,F),b=it.call(bt,p)!==!1&&b}}return b&&!p.defaultPrevented}function Ku(a,l,d){if(typeof a=="function")d&&(a=g(a,d));else if(a&&typeof a.handleEvent=="function")a=g(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(l)?-1:u.setTimeout(a,l||0)}function Qu(a){a.g=Ku(()=>{a.g=null,a.i&&(a.i=!1,Qu(a))},a.l);const l=a.h;a.h=null,a.m.apply(null,l)}class $m extends ye{constructor(l,d){super(),this.m=l,this.l=d,this.h=null,this.i=!1,this.g=null}j(l){this.h=arguments,this.g?this.i=!0:Qu(this)}N(){super.N(),this.g&&(u.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Pr(a){ye.call(this),this.h=a,this.g={}}V(Pr,ye);var Wu=[];function Hu(a){G(a.g,function(l,d){this.g.hasOwnProperty(d)&&Eo(l)},a),a.g={}}Pr.prototype.N=function(){Pr.aa.N.call(this),Hu(this)},Pr.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var wo=u.JSON.stringify,Gm=u.JSON.parse,Km=class{stringify(a){return u.JSON.stringify(a,void 0)}parse(a){return u.JSON.parse(a,void 0)}};function Ao(){}Ao.prototype.h=null;function Xu(a){return a.h||(a.h=a.i())}function Ju(){}var Vr={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function bo(){Pt.call(this,"d")}V(bo,Pt);function Ro(){Pt.call(this,"c")}V(Ro,Pt);var Xe={},Yu=null;function Us(){return Yu=Yu||new Vt}Xe.La="serverreachability";function Zu(a){Pt.call(this,Xe.La,a)}V(Zu,Pt);function Cr(a){const l=Us();Mt(l,new Zu(l))}Xe.STAT_EVENT="statevent";function tc(a,l){Pt.call(this,Xe.STAT_EVENT,a),this.stat=l}V(tc,Pt);function Lt(a){const l=Us();Mt(l,new tc(l,a))}Xe.Ma="timingevent";function ec(a,l){Pt.call(this,Xe.Ma,a),this.size=l}V(ec,Pt);function Dr(a,l){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return u.setTimeout(function(){a()},l)}function xr(){this.g=!0}xr.prototype.xa=function(){this.g=!1};function Qm(a,l,d,p,b,P){a.info(function(){if(a.g)if(P)for(var F="",it=P.split("&"),bt=0;bt<it.length;bt++){var Y=it[bt].split("=");if(1<Y.length){var Ct=Y[0];Y=Y[1];var Dt=Ct.split("_");F=2<=Dt.length&&Dt[1]=="type"?F+(Ct+"="+Y+"&"):F+(Ct+"=redacted&")}}else F=null;else F=P;return"XMLHTTP REQ ("+p+") [attempt "+b+"]: "+l+`
`+d+`
`+F})}function Wm(a,l,d,p,b,P,F){a.info(function(){return"XMLHTTP RESP ("+p+") [ attempt "+b+"]: "+l+`
`+d+`
`+P+" "+F})}function Sn(a,l,d,p){a.info(function(){return"XMLHTTP TEXT ("+l+"): "+Xm(a,d)+(p?" "+p:"")})}function Hm(a,l){a.info(function(){return"TIMEOUT: "+l})}xr.prototype.info=function(){};function Xm(a,l){if(!a.g)return l;if(!l)return null;try{var d=JSON.parse(l);if(d){for(a=0;a<d.length;a++)if(Array.isArray(d[a])){var p=d[a];if(!(2>p.length)){var b=p[1];if(Array.isArray(b)&&!(1>b.length)){var P=b[0];if(P!="noop"&&P!="stop"&&P!="close")for(var F=1;F<b.length;F++)b[F]=""}}}}return wo(d)}catch{return l}}var qs={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},nc={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},So;function js(){}V(js,Ao),js.prototype.g=function(){return new XMLHttpRequest},js.prototype.i=function(){return{}},So=new js;function Ie(a,l,d,p){this.j=a,this.i=l,this.l=d,this.R=p||1,this.U=new Pr(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new rc}function rc(){this.i=null,this.g="",this.h=!1}var sc={},Po={};function Vo(a,l,d){a.L=1,a.v=Ks(ae(l)),a.m=d,a.P=!0,ic(a,null)}function ic(a,l){a.F=Date.now(),zs(a),a.A=ae(a.v);var d=a.A,p=a.R;Array.isArray(p)||(p=[String(p)]),Ic(d.i,"t",p),a.C=0,d=a.j.J,a.h=new rc,a.g=Mc(a.j,d?l:null,!a.m),0<a.O&&(a.M=new $m(g(a.Y,a,a.g),a.O)),l=a.U,d=a.g,p=a.ca;var b="readystatechange";Array.isArray(b)||(b&&(Wu[0]=b.toString()),b=Wu);for(var P=0;P<b.length;P++){var F=ju(d,b[P],p||l.handleEvent,!1,l.h||l);if(!F)break;l.g[F.key]=F}l=a.H?_(a.H):{},a.m?(a.u||(a.u="POST"),l["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.A,a.u,a.m,l)):(a.u="GET",a.g.ea(a.A,a.u,null,l)),Cr(),Qm(a.i,a.u,a.A,a.l,a.R,a.m)}Ie.prototype.ca=function(a){a=a.target;const l=this.M;l&&ue(a)==3?l.j():this.Y(a)},Ie.prototype.Y=function(a){try{if(a==this.g)t:{const Dt=ue(this.g);var l=this.g.Ba();const Cn=this.g.Z();if(!(3>Dt)&&(Dt!=3||this.g&&(this.h.h||this.g.oa()||Rc(this.g)))){this.J||Dt!=4||l==7||(l==8||0>=Cn?Cr(3):Cr(2)),Co(this);var d=this.g.Z();this.X=d;e:if(oc(this)){var p=Rc(this.g);a="";var b=p.length,P=ue(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){Je(this),Nr(this);var F="";break e}this.h.i=new u.TextDecoder}for(l=0;l<b;l++)this.h.h=!0,a+=this.h.i.decode(p[l],{stream:!(P&&l==b-1)});p.length=0,this.h.g+=a,this.C=0,F=this.h.g}else F=this.g.oa();if(this.o=d==200,Wm(this.i,this.u,this.A,this.l,this.R,Dt,d),this.o){if(this.T&&!this.K){e:{if(this.g){var it,bt=this.g;if((it=bt.g?bt.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!q(it)){var Y=it;break e}}Y=null}if(d=Y)Sn(this.i,this.l,d,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,Do(this,d);else{this.o=!1,this.s=3,Lt(12),Je(this),Nr(this);break t}}if(this.P){d=!0;let Ht;for(;!this.J&&this.C<F.length;)if(Ht=Jm(this,F),Ht==Po){Dt==4&&(this.s=4,Lt(14),d=!1),Sn(this.i,this.l,null,"[Incomplete Response]");break}else if(Ht==sc){this.s=4,Lt(15),Sn(this.i,this.l,F,"[Invalid Chunk]"),d=!1;break}else Sn(this.i,this.l,Ht,null),Do(this,Ht);if(oc(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Dt!=4||F.length!=0||this.h.h||(this.s=1,Lt(16),d=!1),this.o=this.o&&d,!d)Sn(this.i,this.l,F,"[Invalid Chunked Response]"),Je(this),Nr(this);else if(0<F.length&&!this.W){this.W=!0;var Ct=this.j;Ct.g==this&&Ct.ba&&!Ct.M&&(Ct.j.info("Great, no buffering proxy detected. Bytes received: "+F.length),Mo(Ct),Ct.M=!0,Lt(11))}}else Sn(this.i,this.l,F,null),Do(this,F);Dt==4&&Je(this),this.o&&!this.J&&(Dt==4?Nc(this.j,this):(this.o=!1,zs(this)))}else mp(this.g),d==400&&0<F.indexOf("Unknown SID")?(this.s=3,Lt(12)):(this.s=0,Lt(13)),Je(this),Nr(this)}}}catch{}finally{}};function oc(a){return a.g?a.u=="GET"&&a.L!=2&&a.j.Ca:!1}function Jm(a,l){var d=a.C,p=l.indexOf(`
`,d);return p==-1?Po:(d=Number(l.substring(d,p)),isNaN(d)?sc:(p+=1,p+d>l.length?Po:(l=l.slice(p,p+d),a.C=p+d,l)))}Ie.prototype.cancel=function(){this.J=!0,Je(this)};function zs(a){a.S=Date.now()+a.I,ac(a,a.I)}function ac(a,l){if(a.B!=null)throw Error("WatchDog timer not null");a.B=Dr(g(a.ba,a),l)}function Co(a){a.B&&(u.clearTimeout(a.B),a.B=null)}Ie.prototype.ba=function(){this.B=null;const a=Date.now();0<=a-this.S?(Hm(this.i,this.A),this.L!=2&&(Cr(),Lt(17)),Je(this),this.s=2,Nr(this)):ac(this,this.S-a)};function Nr(a){a.j.G==0||a.J||Nc(a.j,a)}function Je(a){Co(a);var l=a.M;l&&typeof l.ma=="function"&&l.ma(),a.M=null,Hu(a.U),a.g&&(l=a.g,a.g=null,l.abort(),l.ma())}function Do(a,l){try{var d=a.j;if(d.G!=0&&(d.g==a||xo(d.h,a))){if(!a.K&&xo(d.h,a)&&d.G==3){try{var p=d.Da.g.parse(l)}catch{p=null}if(Array.isArray(p)&&p.length==3){var b=p;if(b[0]==0){t:if(!d.u){if(d.g)if(d.g.F+3e3<a.F)Ys(d),Xs(d);else break t;Fo(d),Lt(18)}}else d.za=b[1],0<d.za-d.T&&37500>b[2]&&d.F&&d.v==0&&!d.C&&(d.C=Dr(g(d.Za,d),6e3));if(1>=lc(d.h)&&d.ca){try{d.ca()}catch{}d.ca=void 0}}else Ze(d,11)}else if((a.K||d.g==a)&&Ys(d),!q(l))for(b=d.Da.g.parse(l),l=0;l<b.length;l++){let Y=b[l];if(d.T=Y[0],Y=Y[1],d.G==2)if(Y[0]=="c"){d.K=Y[1],d.ia=Y[2];const Ct=Y[3];Ct!=null&&(d.la=Ct,d.j.info("VER="+d.la));const Dt=Y[4];Dt!=null&&(d.Aa=Dt,d.j.info("SVER="+d.Aa));const Cn=Y[5];Cn!=null&&typeof Cn=="number"&&0<Cn&&(p=1.5*Cn,d.L=p,d.j.info("backChannelRequestTimeoutMs_="+p)),p=d;const Ht=a.g;if(Ht){const ti=Ht.g?Ht.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(ti){var P=p.h;P.g||ti.indexOf("spdy")==-1&&ti.indexOf("quic")==-1&&ti.indexOf("h2")==-1||(P.j=P.l,P.g=new Set,P.h&&(No(P,P.h),P.h=null))}if(p.D){const Lo=Ht.g?Ht.g.getResponseHeader("X-HTTP-Session-Id"):null;Lo&&(p.ya=Lo,at(p.I,p.D,Lo))}}d.G=3,d.l&&d.l.ua(),d.ba&&(d.R=Date.now()-a.F,d.j.info("Handshake RTT: "+d.R+"ms")),p=d;var F=a;if(p.qa=Fc(p,p.J?p.ia:null,p.W),F.K){hc(p.h,F);var it=F,bt=p.L;bt&&(it.I=bt),it.B&&(Co(it),zs(it)),p.g=F}else Dc(p);0<d.i.length&&Js(d)}else Y[0]!="stop"&&Y[0]!="close"||Ze(d,7);else d.G==3&&(Y[0]=="stop"||Y[0]=="close"?Y[0]=="stop"?Ze(d,7):Oo(d):Y[0]!="noop"&&d.l&&d.l.ta(Y),d.v=0)}}Cr(4)}catch{}}var Ym=class{constructor(a,l){this.g=a,this.map=l}};function uc(a){this.l=a||10,u.PerformanceNavigationTiming?(a=u.performance.getEntriesByType("navigation"),a=0<a.length&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(u.chrome&&u.chrome.loadTimes&&u.chrome.loadTimes()&&u.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function cc(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function lc(a){return a.h?1:a.g?a.g.size:0}function xo(a,l){return a.h?a.h==l:a.g?a.g.has(l):!1}function No(a,l){a.g?a.g.add(l):a.h=l}function hc(a,l){a.h&&a.h==l?a.h=null:a.g&&a.g.has(l)&&a.g.delete(l)}uc.prototype.cancel=function(){if(this.i=dc(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function dc(a){if(a.h!=null)return a.i.concat(a.h.D);if(a.g!=null&&a.g.size!==0){let l=a.i;for(const d of a.g.values())l=l.concat(d.D);return l}return D(a.i)}function Zm(a){if(a.V&&typeof a.V=="function")return a.V();if(typeof Map<"u"&&a instanceof Map||typeof Set<"u"&&a instanceof Set)return Array.from(a.values());if(typeof a=="string")return a.split("");if(c(a)){for(var l=[],d=a.length,p=0;p<d;p++)l.push(a[p]);return l}l=[],d=0;for(p in a)l[d++]=a[p];return l}function tp(a){if(a.na&&typeof a.na=="function")return a.na();if(!a.V||typeof a.V!="function"){if(typeof Map<"u"&&a instanceof Map)return Array.from(a.keys());if(!(typeof Set<"u"&&a instanceof Set)){if(c(a)||typeof a=="string"){var l=[];a=a.length;for(var d=0;d<a;d++)l.push(d);return l}l=[],d=0;for(const p in a)l[d++]=p;return l}}}function fc(a,l){if(a.forEach&&typeof a.forEach=="function")a.forEach(l,void 0);else if(c(a)||typeof a=="string")Array.prototype.forEach.call(a,l,void 0);else for(var d=tp(a),p=Zm(a),b=p.length,P=0;P<b;P++)l.call(void 0,p[P],d&&d[P],a)}var mc=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function ep(a,l){if(a){a=a.split("&");for(var d=0;d<a.length;d++){var p=a[d].indexOf("="),b=null;if(0<=p){var P=a[d].substring(0,p);b=a[d].substring(p+1)}else P=a[d];l(P,b?decodeURIComponent(b.replace(/\+/g," ")):"")}}}function Ye(a){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,a instanceof Ye){this.h=a.h,$s(this,a.j),this.o=a.o,this.g=a.g,Gs(this,a.s),this.l=a.l;var l=a.i,d=new Fr;d.i=l.i,l.g&&(d.g=new Map(l.g),d.h=l.h),pc(this,d),this.m=a.m}else a&&(l=String(a).match(mc))?(this.h=!1,$s(this,l[1]||"",!0),this.o=kr(l[2]||""),this.g=kr(l[3]||"",!0),Gs(this,l[4]),this.l=kr(l[5]||"",!0),pc(this,l[6]||"",!0),this.m=kr(l[7]||"")):(this.h=!1,this.i=new Fr(null,this.h))}Ye.prototype.toString=function(){var a=[],l=this.j;l&&a.push(Or(l,gc,!0),":");var d=this.g;return(d||l=="file")&&(a.push("//"),(l=this.o)&&a.push(Or(l,gc,!0),"@"),a.push(encodeURIComponent(String(d)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),d=this.s,d!=null&&a.push(":",String(d))),(d=this.l)&&(this.g&&d.charAt(0)!="/"&&a.push("/"),a.push(Or(d,d.charAt(0)=="/"?sp:rp,!0))),(d=this.i.toString())&&a.push("?",d),(d=this.m)&&a.push("#",Or(d,op)),a.join("")};function ae(a){return new Ye(a)}function $s(a,l,d){a.j=d?kr(l,!0):l,a.j&&(a.j=a.j.replace(/:$/,""))}function Gs(a,l){if(l){if(l=Number(l),isNaN(l)||0>l)throw Error("Bad port number "+l);a.s=l}else a.s=null}function pc(a,l,d){l instanceof Fr?(a.i=l,ap(a.i,a.h)):(d||(l=Or(l,ip)),a.i=new Fr(l,a.h))}function at(a,l,d){a.i.set(l,d)}function Ks(a){return at(a,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),a}function kr(a,l){return a?l?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Or(a,l,d){return typeof a=="string"?(a=encodeURI(a).replace(l,np),d&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function np(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var gc=/[#\/\?@]/g,rp=/[#\?:]/g,sp=/[#\?]/g,ip=/[#\?@]/g,op=/#/g;function Fr(a,l){this.h=this.g=null,this.i=a||null,this.j=!!l}function Ee(a){a.g||(a.g=new Map,a.h=0,a.i&&ep(a.i,function(l,d){a.add(decodeURIComponent(l.replace(/\+/g," ")),d)}))}r=Fr.prototype,r.add=function(a,l){Ee(this),this.i=null,a=Pn(this,a);var d=this.g.get(a);return d||this.g.set(a,d=[]),d.push(l),this.h+=1,this};function _c(a,l){Ee(a),l=Pn(a,l),a.g.has(l)&&(a.i=null,a.h-=a.g.get(l).length,a.g.delete(l))}function yc(a,l){return Ee(a),l=Pn(a,l),a.g.has(l)}r.forEach=function(a,l){Ee(this),this.g.forEach(function(d,p){d.forEach(function(b){a.call(l,b,p,this)},this)},this)},r.na=function(){Ee(this);const a=Array.from(this.g.values()),l=Array.from(this.g.keys()),d=[];for(let p=0;p<l.length;p++){const b=a[p];for(let P=0;P<b.length;P++)d.push(l[p])}return d},r.V=function(a){Ee(this);let l=[];if(typeof a=="string")yc(this,a)&&(l=l.concat(this.g.get(Pn(this,a))));else{a=Array.from(this.g.values());for(let d=0;d<a.length;d++)l=l.concat(a[d])}return l},r.set=function(a,l){return Ee(this),this.i=null,a=Pn(this,a),yc(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[l]),this.h+=1,this},r.get=function(a,l){return a?(a=this.V(a),0<a.length?String(a[0]):l):l};function Ic(a,l,d){_c(a,l),0<d.length&&(a.i=null,a.g.set(Pn(a,l),D(d)),a.h+=d.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],l=Array.from(this.g.keys());for(var d=0;d<l.length;d++){var p=l[d];const P=encodeURIComponent(String(p)),F=this.V(p);for(p=0;p<F.length;p++){var b=P;F[p]!==""&&(b+="="+encodeURIComponent(String(F[p]))),a.push(b)}}return this.i=a.join("&")};function Pn(a,l){return l=String(l),a.j&&(l=l.toLowerCase()),l}function ap(a,l){l&&!a.j&&(Ee(a),a.i=null,a.g.forEach(function(d,p){var b=p.toLowerCase();p!=b&&(_c(this,p),Ic(this,b,d))},a)),a.j=l}function up(a,l){const d=new xr;if(u.Image){const p=new Image;p.onload=w(Te,d,"TestLoadImage: loaded",!0,l,p),p.onerror=w(Te,d,"TestLoadImage: error",!1,l,p),p.onabort=w(Te,d,"TestLoadImage: abort",!1,l,p),p.ontimeout=w(Te,d,"TestLoadImage: timeout",!1,l,p),u.setTimeout(function(){p.ontimeout&&p.ontimeout()},1e4),p.src=a}else l(!1)}function cp(a,l){const d=new xr,p=new AbortController,b=setTimeout(()=>{p.abort(),Te(d,"TestPingServer: timeout",!1,l)},1e4);fetch(a,{signal:p.signal}).then(P=>{clearTimeout(b),P.ok?Te(d,"TestPingServer: ok",!0,l):Te(d,"TestPingServer: server error",!1,l)}).catch(()=>{clearTimeout(b),Te(d,"TestPingServer: error",!1,l)})}function Te(a,l,d,p,b){try{b&&(b.onload=null,b.onerror=null,b.onabort=null,b.ontimeout=null),p(d)}catch{}}function lp(){this.g=new Km}function hp(a,l,d){const p=d||"";try{fc(a,function(b,P){let F=b;h(b)&&(F=wo(b)),l.push(p+P+"="+encodeURIComponent(F))})}catch(b){throw l.push(p+"type="+encodeURIComponent("_badmap")),b}}function Qs(a){this.l=a.Ub||null,this.j=a.eb||!1}V(Qs,Ao),Qs.prototype.g=function(){return new Ws(this.l,this.j)},Qs.prototype.i=function(a){return function(){return a}}({});function Ws(a,l){Vt.call(this),this.D=a,this.o=l,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}V(Ws,Vt),r=Ws.prototype,r.open=function(a,l){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=a,this.A=l,this.readyState=1,Lr(this)},r.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const l={headers:this.u,method:this.B,credentials:this.m,cache:void 0};a&&(l.body=a),(this.D||u).fetch(new Request(this.A,l)).then(this.Sa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,Mr(this)),this.readyState=0},r.Sa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,Lr(this)),this.g&&(this.readyState=3,Lr(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof u.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;Ec(this)}else a.text().then(this.Ra.bind(this),this.ga.bind(this))};function Ec(a){a.j.read().then(a.Pa.bind(a)).catch(a.ga.bind(a))}r.Pa=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var l=a.value?a.value:new Uint8Array(0);(l=this.v.decode(l,{stream:!a.done}))&&(this.response=this.responseText+=l)}a.done?Mr(this):Lr(this),this.readyState==3&&Ec(this)}},r.Ra=function(a){this.g&&(this.response=this.responseText=a,Mr(this))},r.Qa=function(a){this.g&&(this.response=a,Mr(this))},r.ga=function(){this.g&&Mr(this)};function Mr(a){a.readyState=4,a.l=null,a.j=null,a.v=null,Lr(a)}r.setRequestHeader=function(a,l){this.u.append(a,l)},r.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],l=this.h.entries();for(var d=l.next();!d.done;)d=d.value,a.push(d[0]+": "+d[1]),d=l.next();return a.join(`\r
`)};function Lr(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Ws.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Tc(a){let l="";return G(a,function(d,p){l+=p,l+=":",l+=d,l+=`\r
`}),l}function ko(a,l,d){t:{for(p in d){var p=!1;break t}p=!0}p||(d=Tc(d),typeof a=="string"?d!=null&&encodeURIComponent(String(d)):at(a,l,d))}function mt(a){Vt.call(this),this.headers=new Map,this.o=a||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}V(mt,Vt);var dp=/^https?$/i,fp=["POST","PUT"];r=mt.prototype,r.Ha=function(a){this.J=a},r.ea=function(a,l,d,p){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);l=l?l.toUpperCase():"GET",this.D=a,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():So.g(),this.v=this.o?Xu(this.o):Xu(So),this.g.onreadystatechange=g(this.Ea,this);try{this.B=!0,this.g.open(l,String(a),!0),this.B=!1}catch(P){vc(this,P);return}if(a=d||"",d=new Map(this.headers),p)if(Object.getPrototypeOf(p)===Object.prototype)for(var b in p)d.set(b,p[b]);else if(typeof p.keys=="function"&&typeof p.get=="function")for(const P of p.keys())d.set(P,p.get(P));else throw Error("Unknown input type for opt_headers: "+String(p));p=Array.from(d.keys()).find(P=>P.toLowerCase()=="content-type"),b=u.FormData&&a instanceof u.FormData,!(0<=Array.prototype.indexOf.call(fp,l,void 0))||p||b||d.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[P,F]of d)this.g.setRequestHeader(P,F);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{bc(this),this.u=!0,this.g.send(a),this.u=!1}catch(P){vc(this,P)}};function vc(a,l){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=l,a.m=5,wc(a),Hs(a)}function wc(a){a.A||(a.A=!0,Mt(a,"complete"),Mt(a,"error"))}r.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=a||7,Mt(this,"complete"),Mt(this,"abort"),Hs(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Hs(this,!0)),mt.aa.N.call(this)},r.Ea=function(){this.s||(this.B||this.u||this.j?Ac(this):this.bb())},r.bb=function(){Ac(this)};function Ac(a){if(a.h&&typeof o<"u"&&(!a.v[1]||ue(a)!=4||a.Z()!=2)){if(a.u&&ue(a)==4)Ku(a.Ea,0,a);else if(Mt(a,"readystatechange"),ue(a)==4){a.h=!1;try{const F=a.Z();t:switch(F){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var l=!0;break t;default:l=!1}var d;if(!(d=l)){var p;if(p=F===0){var b=String(a.D).match(mc)[1]||null;!b&&u.self&&u.self.location&&(b=u.self.location.protocol.slice(0,-1)),p=!dp.test(b?b.toLowerCase():"")}d=p}if(d)Mt(a,"complete"),Mt(a,"success");else{a.m=6;try{var P=2<ue(a)?a.g.statusText:""}catch{P=""}a.l=P+" ["+a.Z()+"]",wc(a)}}finally{Hs(a)}}}}function Hs(a,l){if(a.g){bc(a);const d=a.g,p=a.v[0]?()=>{}:null;a.g=null,a.v=null,l||Mt(a,"ready");try{d.onreadystatechange=p}catch{}}}function bc(a){a.I&&(u.clearTimeout(a.I),a.I=null)}r.isActive=function(){return!!this.g};function ue(a){return a.g?a.g.readyState:0}r.Z=function(){try{return 2<ue(this)?this.g.status:-1}catch{return-1}},r.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.Oa=function(a){if(this.g){var l=this.g.responseText;return a&&l.indexOf(a)==0&&(l=l.substring(a.length)),Gm(l)}};function Rc(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.H){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function mp(a){const l={};a=(a.g&&2<=ue(a)&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let p=0;p<a.length;p++){if(q(a[p]))continue;var d=v(a[p]);const b=d[0];if(d=d[1],typeof d!="string")continue;d=d.trim();const P=l[b]||[];l[b]=P,P.push(d)}E(l,function(p){return p.join(", ")})}r.Ba=function(){return this.m},r.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function Br(a,l,d){return d&&d.internalChannelParams&&d.internalChannelParams[a]||l}function Sc(a){this.Aa=0,this.i=[],this.j=new xr,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=Br("failFast",!1,a),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=Br("baseRetryDelayMs",5e3,a),this.cb=Br("retryDelaySeedMs",1e4,a),this.Wa=Br("forwardChannelMaxRetries",2,a),this.wa=Br("forwardChannelRequestTimeoutMs",2e4,a),this.pa=a&&a.xmlHttpFactory||void 0,this.Xa=a&&a.Tb||void 0,this.Ca=a&&a.useFetchStreams||!1,this.L=void 0,this.J=a&&a.supportsCrossDomainXhr||!1,this.K="",this.h=new uc(a&&a.concurrentRequestLimit),this.Da=new lp,this.P=a&&a.fastHandshake||!1,this.O=a&&a.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=a&&a.Rb||!1,a&&a.xa&&this.j.xa(),a&&a.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&a&&a.detectBufferingProxy||!1,this.ja=void 0,a&&a.longPollingTimeout&&0<a.longPollingTimeout&&(this.ja=a.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}r=Sc.prototype,r.la=8,r.G=1,r.connect=function(a,l,d,p){Lt(0),this.W=a,this.H=l||{},d&&p!==void 0&&(this.H.OSID=d,this.H.OAID=p),this.F=this.X,this.I=Fc(this,null,this.W),Js(this)};function Oo(a){if(Pc(a),a.G==3){var l=a.U++,d=ae(a.I);if(at(d,"SID",a.K),at(d,"RID",l),at(d,"TYPE","terminate"),Ur(a,d),l=new Ie(a,a.j,l),l.L=2,l.v=Ks(ae(d)),d=!1,u.navigator&&u.navigator.sendBeacon)try{d=u.navigator.sendBeacon(l.v.toString(),"")}catch{}!d&&u.Image&&(new Image().src=l.v,d=!0),d||(l.g=Mc(l.j,null),l.g.ea(l.v)),l.F=Date.now(),zs(l)}Oc(a)}function Xs(a){a.g&&(Mo(a),a.g.cancel(),a.g=null)}function Pc(a){Xs(a),a.u&&(u.clearTimeout(a.u),a.u=null),Ys(a),a.h.cancel(),a.s&&(typeof a.s=="number"&&u.clearTimeout(a.s),a.s=null)}function Js(a){if(!cc(a.h)&&!a.s){a.s=!0;var l=a.Ga;br||qu(),Rr||(br(),Rr=!0),po.add(l,a),a.B=0}}function pp(a,l){return lc(a.h)>=a.h.j-(a.s?1:0)?!1:a.s?(a.i=l.D.concat(a.i),!0):a.G==1||a.G==2||a.B>=(a.Va?0:a.Wa)?!1:(a.s=Dr(g(a.Ga,a,l),kc(a,a.B)),a.B++,!0)}r.Ga=function(a){if(this.s)if(this.s=null,this.G==1){if(!a){this.U=Math.floor(1e5*Math.random()),a=this.U++;const b=new Ie(this,this.j,a);let P=this.o;if(this.S&&(P?(P=_(P),T(P,this.S)):P=this.S),this.m!==null||this.O||(b.H=P,P=null),this.P)t:{for(var l=0,d=0;d<this.i.length;d++){e:{var p=this.i[d];if("__data__"in p.map&&(p=p.map.__data__,typeof p=="string")){p=p.length;break e}p=void 0}if(p===void 0)break;if(l+=p,4096<l){l=d;break t}if(l===4096||d===this.i.length-1){l=d+1;break t}}l=1e3}else l=1e3;l=Cc(this,b,l),d=ae(this.I),at(d,"RID",a),at(d,"CVER",22),this.D&&at(d,"X-HTTP-Session-Id",this.D),Ur(this,d),P&&(this.O?l="headers="+encodeURIComponent(String(Tc(P)))+"&"+l:this.m&&ko(d,this.m,P)),No(this.h,b),this.Ua&&at(d,"TYPE","init"),this.P?(at(d,"$req",l),at(d,"SID","null"),b.T=!0,Vo(b,d,null)):Vo(b,d,l),this.G=2}}else this.G==3&&(a?Vc(this,a):this.i.length==0||cc(this.h)||Vc(this))};function Vc(a,l){var d;l?d=l.l:d=a.U++;const p=ae(a.I);at(p,"SID",a.K),at(p,"RID",d),at(p,"AID",a.T),Ur(a,p),a.m&&a.o&&ko(p,a.m,a.o),d=new Ie(a,a.j,d,a.B+1),a.m===null&&(d.H=a.o),l&&(a.i=l.D.concat(a.i)),l=Cc(a,d,1e3),d.I=Math.round(.5*a.wa)+Math.round(.5*a.wa*Math.random()),No(a.h,d),Vo(d,p,l)}function Ur(a,l){a.H&&G(a.H,function(d,p){at(l,p,d)}),a.l&&fc({},function(d,p){at(l,p,d)})}function Cc(a,l,d){d=Math.min(a.i.length,d);var p=a.l?g(a.l.Na,a.l,a):null;t:{var b=a.i;let P=-1;for(;;){const F=["count="+d];P==-1?0<d?(P=b[0].g,F.push("ofs="+P)):P=0:F.push("ofs="+P);let it=!0;for(let bt=0;bt<d;bt++){let Y=b[bt].g;const Ct=b[bt].map;if(Y-=P,0>Y)P=Math.max(0,b[bt].g-100),it=!1;else try{hp(Ct,F,"req"+Y+"_")}catch{p&&p(Ct)}}if(it){p=F.join("&");break t}}}return a=a.i.splice(0,d),l.D=a,p}function Dc(a){if(!a.g&&!a.u){a.Y=1;var l=a.Fa;br||qu(),Rr||(br(),Rr=!0),po.add(l,a),a.v=0}}function Fo(a){return a.g||a.u||3<=a.v?!1:(a.Y++,a.u=Dr(g(a.Fa,a),kc(a,a.v)),a.v++,!0)}r.Fa=function(){if(this.u=null,xc(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var a=2*this.R;this.j.info("BP detection timer enabled: "+a),this.A=Dr(g(this.ab,this),a)}},r.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Lt(10),Xs(this),xc(this))};function Mo(a){a.A!=null&&(u.clearTimeout(a.A),a.A=null)}function xc(a){a.g=new Ie(a,a.j,"rpc",a.Y),a.m===null&&(a.g.H=a.o),a.g.O=0;var l=ae(a.qa);at(l,"RID","rpc"),at(l,"SID",a.K),at(l,"AID",a.T),at(l,"CI",a.F?"0":"1"),!a.F&&a.ja&&at(l,"TO",a.ja),at(l,"TYPE","xmlhttp"),Ur(a,l),a.m&&a.o&&ko(l,a.m,a.o),a.L&&(a.g.I=a.L);var d=a.g;a=a.ia,d.L=1,d.v=Ks(ae(l)),d.m=null,d.P=!0,ic(d,a)}r.Za=function(){this.C!=null&&(this.C=null,Xs(this),Fo(this),Lt(19))};function Ys(a){a.C!=null&&(u.clearTimeout(a.C),a.C=null)}function Nc(a,l){var d=null;if(a.g==l){Ys(a),Mo(a),a.g=null;var p=2}else if(xo(a.h,l))d=l.D,hc(a.h,l),p=1;else return;if(a.G!=0){if(l.o)if(p==1){d=l.m?l.m.length:0,l=Date.now()-l.F;var b=a.B;p=Us(),Mt(p,new ec(p,d)),Js(a)}else Dc(a);else if(b=l.s,b==3||b==0&&0<l.X||!(p==1&&pp(a,l)||p==2&&Fo(a)))switch(d&&0<d.length&&(l=a.h,l.i=l.i.concat(d)),b){case 1:Ze(a,5);break;case 4:Ze(a,10);break;case 3:Ze(a,6);break;default:Ze(a,2)}}}function kc(a,l){let d=a.Ta+Math.floor(Math.random()*a.cb);return a.isActive()||(d*=2),d*l}function Ze(a,l){if(a.j.info("Error code "+l),l==2){var d=g(a.fb,a),p=a.Xa;const b=!p;p=new Ye(p||"//www.google.com/images/cleardot.gif"),u.location&&u.location.protocol=="http"||$s(p,"https"),Ks(p),b?up(p.toString(),d):cp(p.toString(),d)}else Lt(2);a.G=0,a.l&&a.l.sa(l),Oc(a),Pc(a)}r.fb=function(a){a?(this.j.info("Successfully pinged google.com"),Lt(2)):(this.j.info("Failed to ping google.com"),Lt(1))};function Oc(a){if(a.G=0,a.ka=[],a.l){const l=dc(a.h);(l.length!=0||a.i.length!=0)&&(x(a.ka,l),x(a.ka,a.i),a.h.i.length=0,D(a.i),a.i.length=0),a.l.ra()}}function Fc(a,l,d){var p=d instanceof Ye?ae(d):new Ye(d);if(p.g!="")l&&(p.g=l+"."+p.g),Gs(p,p.s);else{var b=u.location;p=b.protocol,l=l?l+"."+b.hostname:b.hostname,b=+b.port;var P=new Ye(null);p&&$s(P,p),l&&(P.g=l),b&&Gs(P,b),d&&(P.l=d),p=P}return d=a.D,l=a.ya,d&&l&&at(p,d,l),at(p,"VER",a.la),Ur(a,p),p}function Mc(a,l,d){if(l&&!a.J)throw Error("Can't create secondary domain capable XhrIo object.");return l=a.Ca&&!a.pa?new mt(new Qs({eb:d})):new mt(a.pa),l.Ha(a.J),l}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function Lc(){}r=Lc.prototype,r.ua=function(){},r.ta=function(){},r.sa=function(){},r.ra=function(){},r.isActive=function(){return!0},r.Na=function(){};function Zs(){}Zs.prototype.g=function(a,l){return new Gt(a,l)};function Gt(a,l){Vt.call(this),this.g=new Sc(l),this.l=a,this.h=l&&l.messageUrlParams||null,a=l&&l.messageHeaders||null,l&&l.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=l&&l.initMessageHeaders||null,l&&l.messageContentType&&(a?a["X-WebChannel-Content-Type"]=l.messageContentType:a={"X-WebChannel-Content-Type":l.messageContentType}),l&&l.va&&(a?a["X-WebChannel-Client-Profile"]=l.va:a={"X-WebChannel-Client-Profile":l.va}),this.g.S=a,(a=l&&l.Sb)&&!q(a)&&(this.g.m=a),this.v=l&&l.supportsCrossDomainXhr||!1,this.u=l&&l.sendRawJson||!1,(l=l&&l.httpSessionIdParam)&&!q(l)&&(this.g.D=l,a=this.h,a!==null&&l in a&&(a=this.h,l in a&&delete a[l])),this.j=new Vn(this)}V(Gt,Vt),Gt.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},Gt.prototype.close=function(){Oo(this.g)},Gt.prototype.o=function(a){var l=this.g;if(typeof a=="string"){var d={};d.__data__=a,a=d}else this.u&&(d={},d.__data__=wo(a),a=d);l.i.push(new Ym(l.Ya++,a)),l.G==3&&Js(l)},Gt.prototype.N=function(){this.g.l=null,delete this.j,Oo(this.g),delete this.g,Gt.aa.N.call(this)};function Bc(a){bo.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var l=a.__sm__;if(l){t:{for(const d in l){a=d;break t}a=void 0}(this.i=a)&&(a=this.i,l=l!==null&&a in l?l[a]:void 0),this.data=l}else this.data=a}V(Bc,bo);function Uc(){Ro.call(this),this.status=1}V(Uc,Ro);function Vn(a){this.g=a}V(Vn,Lc),Vn.prototype.ua=function(){Mt(this.g,"a")},Vn.prototype.ta=function(a){Mt(this.g,new Bc(a))},Vn.prototype.sa=function(a){Mt(this.g,new Uc)},Vn.prototype.ra=function(){Mt(this.g,"b")},Zs.prototype.createWebChannel=Zs.prototype.g,Gt.prototype.send=Gt.prototype.o,Gt.prototype.open=Gt.prototype.m,Gt.prototype.close=Gt.prototype.close,zh=function(){return new Zs},jh=function(){return Us()},qh=Xe,na={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},qs.NO_ERROR=0,qs.TIMEOUT=8,qs.HTTP_ERROR=6,ci=qs,nc.COMPLETE="complete",Uh=nc,Ju.EventType=Vr,Vr.OPEN="a",Vr.CLOSE="b",Vr.ERROR="c",Vr.MESSAGE="d",Vt.prototype.listen=Vt.prototype.K,Kr=Ju,mt.prototype.listenOnce=mt.prototype.L,mt.prototype.getLastError=mt.prototype.Ka,mt.prototype.getLastErrorCode=mt.prototype.Ba,mt.prototype.getStatus=mt.prototype.Z,mt.prototype.getResponseJson=mt.prototype.Oa,mt.prototype.getResponseText=mt.prototype.oa,mt.prototype.send=mt.prototype.ea,mt.prototype.setWithCredentials=mt.prototype.Ha,Bh=mt}).apply(typeof ei<"u"?ei:typeof self<"u"?self:typeof window<"u"?window:{});const Zc="@firebase/firestore",tl="4.8.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wt{constructor(t){this.uid=t}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(t){return t.uid===this.uid}}wt.UNAUTHENTICATED=new wt(null),wt.GOOGLE_CREDENTIALS=new wt("google-credentials-uid"),wt.FIRST_PARTY=new wt("first-party-uid"),wt.MOCK_USER=new wt("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let dr="11.10.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ke=new Nh("@firebase/firestore");function Mn(){return ke.logLevel}function Xg(r){ke.setLogLevel(r)}function N(r,...t){if(ke.logLevel<=J.DEBUG){const e=t.map(Na);ke.debug(`Firestore (${dr}): ${r}`,...e)}}function pt(r,...t){if(ke.logLevel<=J.ERROR){const e=t.map(Na);ke.error(`Firestore (${dr}): ${r}`,...e)}}function Ft(r,...t){if(ke.logLevel<=J.WARN){const e=t.map(Na);ke.warn(`Firestore (${dr}): ${r}`,...e)}}function Na(r){if(typeof r=="string")return r;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return function(e){return JSON.stringify(e)}(r)}catch{return r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function M(r,t,e){let n="Unexpected state";typeof t=="string"?n=t:e=t,$h(r,n,e)}function $h(r,t,e){let n=`FIRESTORE (${dr}) INTERNAL ASSERTION FAILED: ${t} (ID: ${r.toString(16)})`;if(e!==void 0)try{n+=" CONTEXT: "+JSON.stringify(e)}catch{n+=" CONTEXT: "+e}throw pt(n),new Error(n)}function U(r,t,e,n){let s="Unexpected state";typeof e=="string"?s=e:n=e,r||$h(t,s,n)}function Jg(r,t){r||M(57014,t)}function O(r,t){return r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const R={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class C extends hr{constructor(t,e){super(t,e),this.code=t,this.message=e,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class At{constructor(){this.promise=new Promise((t,e)=>{this.resolve=t,this.reject=e})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gh{constructor(t,e){this.user=e,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${t}`)}}class Kh{getToken(){return Promise.resolve(null)}invalidateToken(){}start(t,e){t.enqueueRetryable(()=>e(wt.UNAUTHENTICATED))}shutdown(){}}class Yg{constructor(t){this.token=t,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(t,e){this.changeListener=e,t.enqueueRetryable(()=>e(this.token.user))}shutdown(){this.changeListener=null}}class Zg{constructor(t){this.t=t,this.currentUser=wt.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(t,e){U(this.o===void 0,42304);let n=this.i;const s=c=>this.i!==n?(n=this.i,e(c)):Promise.resolve();let i=new At;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new At,t.enqueueRetryable(()=>s(this.currentUser))};const o=()=>{const c=i;t.enqueueRetryable(async()=>{await c.promise,await s(this.currentUser)})},u=c=>{N("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=c,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(c=>u(c)),setTimeout(()=>{if(!this.auth){const c=this.t.getImmediate({optional:!0});c?u(c):(N("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new At)}},0),o()}getToken(){const t=this.i,e=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(e).then(n=>this.i!==t?(N("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(U(typeof n.accessToken=="string",31837,{l:n}),new Gh(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const t=this.auth&&this.auth.getUid();return U(t===null||typeof t=="string",2055,{h:t}),new wt(t)}}class t_{constructor(t,e,n){this.P=t,this.T=e,this.I=n,this.type="FirstParty",this.user=wt.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const t=this.R();return t&&this.A.set("Authorization",t),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class e_{constructor(t,e,n){this.P=t,this.T=e,this.I=n}getToken(){return Promise.resolve(new t_(this.P,this.T,this.I))}start(t,e){t.enqueueRetryable(()=>e(wt.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class ra{constructor(t){this.value=t,this.type="AppCheck",this.headers=new Map,t&&t.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class n_{constructor(t,e){this.V=e,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,kg(t)&&t.settings.appCheckToken&&(this.p=t.settings.appCheckToken)}start(t,e){U(this.o===void 0,3512);const n=i=>{i.error!=null&&N("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.m;return this.m=i.token,N("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?e(i.token):Promise.resolve()};this.o=i=>{t.enqueueRetryable(()=>n(i))};const s=i=>{N("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(i=>s(i)),setTimeout(()=>{if(!this.appCheck){const i=this.V.getImmediate({optional:!0});i?s(i):N("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new ra(this.p));const t=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(t).then(e=>e?(U(typeof e.token=="string",44558,{tokenResult:e}),this.m=e.token,new ra(e.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}class r_{getToken(){return Promise.resolve(new ra(""))}invalidateToken(){}start(t,e){}shutdown(){}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function s_(r){const t=typeof self<"u"&&(self.crypto||self.msCrypto),e=new Uint8Array(r);if(t&&typeof t.getRandomValues=="function")t.getRandomValues(e);else for(let n=0;n<r;n++)e[n]=Math.floor(256*Math.random());return e}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ka(){return new TextEncoder}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qi{static newId(){const t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",e=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const s=s_(40);for(let i=0;i<s.length;++i)n.length<20&&s[i]<e&&(n+=t.charAt(s[i]%62))}return n}}function z(r,t){return r<t?-1:r>t?1:0}function sa(r,t){let e=0;for(;e<r.length&&e<t.length;){const n=r.codePointAt(e),s=t.codePointAt(e);if(n!==s){if(n<128&&s<128)return z(n,s);{const i=ka(),o=i_(i.encode(el(r,e)),i.encode(el(t,e)));return o!==0?o:z(n,s)}}e+=n>65535?2:1}return z(r.length,t.length)}function el(r,t){return r.codePointAt(t)>65535?r.substring(t,t+2):r.substring(t,t+1)}function i_(r,t){for(let e=0;e<r.length&&e<t.length;++e)if(r[e]!==t[e])return z(r[e],t[e]);return z(r.length,t.length)}function $n(r,t,e){return r.length===t.length&&r.every((n,s)=>e(n,t[s]))}function Qh(r){return r+"\0"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ia="__name__";class Zt{constructor(t,e,n){e===void 0?e=0:e>t.length&&M(637,{offset:e,range:t.length}),n===void 0?n=t.length-e:n>t.length-e&&M(1746,{length:n,range:t.length-e}),this.segments=t,this.offset=e,this.len=n}get length(){return this.len}isEqual(t){return Zt.comparator(this,t)===0}child(t){const e=this.segments.slice(this.offset,this.limit());return t instanceof Zt?t.forEach(n=>{e.push(n)}):e.push(t),this.construct(e)}limit(){return this.offset+this.length}popFirst(t){return t=t===void 0?1:t,this.construct(this.segments,this.offset+t,this.length-t)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(t){return this.segments[this.offset+t]}isEmpty(){return this.length===0}isPrefixOf(t){if(t.length<this.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}isImmediateParentOf(t){if(this.length+1!==t.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}forEach(t){for(let e=this.offset,n=this.limit();e<n;e++)t(this.segments[e])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(t,e){const n=Math.min(t.length,e.length);for(let s=0;s<n;s++){const i=Zt.compareSegments(t.get(s),e.get(s));if(i!==0)return i}return z(t.length,e.length)}static compareSegments(t,e){const n=Zt.isNumericId(t),s=Zt.isNumericId(e);return n&&!s?-1:!n&&s?1:n&&s?Zt.extractNumericId(t).compare(Zt.extractNumericId(e)):sa(t,e)}static isNumericId(t){return t.startsWith("__id")&&t.endsWith("__")}static extractNumericId(t){return De.fromString(t.substring(4,t.length-2))}}class Q extends Zt{construct(t,e,n){return new Q(t,e,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...t){const e=[];for(const n of t){if(n.indexOf("//")>=0)throw new C(R.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);e.push(...n.split("/").filter(s=>s.length>0))}return new Q(e)}static emptyPath(){return new Q([])}}const o_=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class ct extends Zt{construct(t,e,n){return new ct(t,e,n)}static isValidIdentifier(t){return o_.test(t)}canonicalString(){return this.toArray().map(t=>(t=t.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),ct.isValidIdentifier(t)||(t="`"+t+"`"),t)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===ia}static keyField(){return new ct([ia])}static fromServerFormat(t){const e=[];let n="",s=0;const i=()=>{if(n.length===0)throw new C(R.INVALID_ARGUMENT,`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);e.push(n),n=""};let o=!1;for(;s<t.length;){const u=t[s];if(u==="\\"){if(s+1===t.length)throw new C(R.INVALID_ARGUMENT,"Path has trailing escape character: "+t);const c=t[s+1];if(c!=="\\"&&c!=="."&&c!=="`")throw new C(R.INVALID_ARGUMENT,"Path has invalid escape sequence: "+t);n+=c,s+=2}else u==="`"?(o=!o,s++):u!=="."||o?(n+=u,s++):(i(),s++)}if(i(),o)throw new C(R.INVALID_ARGUMENT,"Unterminated ` in path: "+t);return new ct(e)}static emptyPath(){return new ct([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class k{constructor(t){this.path=t}static fromPath(t){return new k(Q.fromString(t))}static fromName(t){return new k(Q.fromString(t).popFirst(5))}static empty(){return new k(Q.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(t){return this.path.length>=2&&this.path.get(this.path.length-2)===t}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(t){return t!==null&&Q.comparator(this.path,t.path)===0}toString(){return this.path.toString()}static comparator(t,e){return Q.comparator(t.path,e.path)}static isDocumentKey(t){return t.length%2==0}static fromSegments(t){return new k(new Q(t.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oa(r,t,e){if(!e)throw new C(R.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${t}.`)}function Wh(r,t,e,n){if(t===!0&&n===!0)throw new C(R.INVALID_ARGUMENT,`${r} and ${e} cannot be used together.`)}function nl(r){if(!k.isDocumentKey(r))throw new C(R.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function rl(r){if(k.isDocumentKey(r))throw new C(R.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function Hh(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function ji(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const t=function(n){return n.constructor?n.constructor.name:null}(r);return t?`a custom ${t} object`:"an object"}}return typeof r=="function"?"a function":M(12329,{type:typeof r})}function W(r,t){if("_delegate"in r&&(r=r._delegate),!(r instanceof t)){if(t.name===r.constructor.name)throw new C(R.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const e=ji(r);throw new C(R.INVALID_ARGUMENT,`Expected type '${t.name}', but it was: ${e}`)}}return r}function Xh(r,t){if(t<=0)throw new C(R.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${t}.`)}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yt(r,t){const e={typeString:r};return t&&(e.value=t),e}function vn(r,t){if(!Hh(r))throw new C(R.INVALID_ARGUMENT,"JSON must be an object");let e;for(const n in t)if(t[n]){const s=t[n].typeString,i="value"in t[n]?{value:t[n].value}:void 0;if(!(n in r)){e=`JSON missing required field: '${n}'`;break}const o=r[n];if(s&&typeof o!==s){e=`JSON field '${n}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){e=`Expected '${n}' field to equal '${i.value}'`;break}}if(e)throw new C(R.INVALID_ARGUMENT,e);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sl=-62135596800,il=1e6;class Z{static now(){return Z.fromMillis(Date.now())}static fromDate(t){return Z.fromMillis(t.getTime())}static fromMillis(t){const e=Math.floor(t/1e3),n=Math.floor((t-1e3*e)*il);return new Z(e,n)}constructor(t,e){if(this.seconds=t,this.nanoseconds=e,e<0)throw new C(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(e>=1e9)throw new C(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(t<sl)throw new C(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);if(t>=253402300800)throw new C(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/il}_compareTo(t){return this.seconds===t.seconds?z(this.nanoseconds,t.nanoseconds):z(this.seconds,t.seconds)}isEqual(t){return t.seconds===this.seconds&&t.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:Z._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(t){if(vn(t,Z._jsonSchema))return new Z(t.seconds,t.nanoseconds)}valueOf(){const t=this.seconds-sl;return String(t).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}Z._jsonSchemaVersion="firestore/timestamp/1.0",Z._jsonSchema={type:yt("string",Z._jsonSchemaVersion),seconds:yt("number"),nanoseconds:yt("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class j{static fromTimestamp(t){return new j(t)}static min(){return new j(new Z(0,0))}static max(){return new j(new Z(253402300799,999999999))}constructor(t){this.timestamp=t}compareTo(t){return this.timestamp._compareTo(t.timestamp)}isEqual(t){return this.timestamp.isEqual(t.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gn=-1;class Kn{constructor(t,e,n,s){this.indexId=t,this.collectionGroup=e,this.fields=n,this.indexState=s}}function oa(r){return r.fields.find(t=>t.kind===2)}function nn(r){return r.fields.filter(t=>t.kind!==2)}function a_(r,t){let e=z(r.collectionGroup,t.collectionGroup);if(e!==0)return e;for(let n=0;n<Math.min(r.fields.length,t.fields.length);++n)if(e=u_(r.fields[n],t.fields[n]),e!==0)return e;return z(r.fields.length,t.fields.length)}Kn.UNKNOWN_ID=-1;class ln{constructor(t,e){this.fieldPath=t,this.kind=e}}function u_(r,t){const e=ct.comparator(r.fieldPath,t.fieldPath);return e!==0?e:z(r.kind,t.kind)}class Qn{constructor(t,e){this.sequenceNumber=t,this.offset=e}static empty(){return new Qn(0,Qt.min())}}function Jh(r,t){const e=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,s=j.fromTimestamp(n===1e9?new Z(e+1,0):new Z(e,n));return new Qt(s,k.empty(),t)}function Yh(r){return new Qt(r.readTime,r.key,Gn)}class Qt{constructor(t,e,n){this.readTime=t,this.documentKey=e,this.largestBatchId=n}static min(){return new Qt(j.min(),k.empty(),Gn)}static max(){return new Qt(j.max(),k.empty(),Gn)}}function Fa(r,t){let e=r.readTime.compareTo(t.readTime);return e!==0?e:(e=k.comparator(r.documentKey,t.documentKey),e!==0?e:z(r.largestBatchId,t.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zh="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class td{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(t){this.onCommittedListeners.push(t)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(t=>t())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function je(r){if(r.code!==R.FAILED_PRECONDITION||r.message!==Zh)throw r;N("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class A{constructor(t){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,t(e=>{this.isDone=!0,this.result=e,this.nextCallback&&this.nextCallback(e)},e=>{this.isDone=!0,this.error=e,this.catchCallback&&this.catchCallback(e)})}catch(t){return this.next(void 0,t)}next(t,e){return this.callbackAttached&&M(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(e,this.error):this.wrapSuccess(t,this.result):new A((n,s)=>{this.nextCallback=i=>{this.wrapSuccess(t,i).next(n,s)},this.catchCallback=i=>{this.wrapFailure(e,i).next(n,s)}})}toPromise(){return new Promise((t,e)=>{this.next(t,e)})}wrapUserFunction(t){try{const e=t();return e instanceof A?e:A.resolve(e)}catch(e){return A.reject(e)}}wrapSuccess(t,e){return t?this.wrapUserFunction(()=>t(e)):A.resolve(e)}wrapFailure(t,e){return t?this.wrapUserFunction(()=>t(e)):A.reject(e)}static resolve(t){return new A((e,n)=>{e(t)})}static reject(t){return new A((e,n)=>{n(t)})}static waitFor(t){return new A((e,n)=>{let s=0,i=0,o=!1;t.forEach(u=>{++s,u.next(()=>{++i,o&&i===s&&e()},c=>n(c))}),o=!0,i===s&&e()})}static or(t){let e=A.resolve(!1);for(const n of t)e=e.next(s=>s?A.resolve(s):n());return e}static forEach(t,e){const n=[];return t.forEach((s,i)=>{n.push(e.call(this,s,i))}),this.waitFor(n)}static mapArray(t,e){return new A((n,s)=>{const i=t.length,o=new Array(i);let u=0;for(let c=0;c<i;c++){const h=c;e(t[h]).next(f=>{o[h]=f,++u,u===i&&n(o)},f=>s(f))}})}static doWhile(t,e){return new A((n,s)=>{const i=()=>{t()===!0?e().next(()=>{i()},s):n()};i()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Kt="SimpleDb";class zi{static open(t,e,n,s){try{return new zi(e,t.transaction(s,n))}catch(i){throw new Yr(e,i)}}constructor(t,e){this.action=t,this.transaction=e,this.aborted=!1,this.S=new At,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{e.error?this.S.reject(new Yr(t,e.error)):this.S.resolve()},this.transaction.onerror=n=>{const s=Ma(n.target.error);this.S.reject(new Yr(t,s))}}get D(){return this.S.promise}abort(t){t&&this.S.reject(t),this.aborted||(N(Kt,"Aborting transaction:",t?t.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}v(){const t=this.transaction;this.aborted||typeof t.commit!="function"||t.commit()}store(t){const e=this.transaction.objectStore(t);return new l_(e)}}class re{static delete(t){return N(Kt,"Removing database:",t),sn(bh().indexedDB.deleteDatabase(t)).toPromise()}static C(){if(!Dh())return!1;if(re.F())return!0;const t=zn(),e=re.M(t),n=0<e&&e<10,s=ed(t),i=0<s&&s<4.5;return!(t.indexOf("MSIE ")>0||t.indexOf("Trident/")>0||t.indexOf("Edge/")>0||n||i)}static F(){var t;return typeof process<"u"&&((t=process.__PRIVATE_env)===null||t===void 0?void 0:t.O)==="YES"}static N(t,e){return t.store(e)}static M(t){const e=t.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=e?e[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(t,e,n){this.name=t,this.version=e,this.B=n,this.L=null,re.M(zn())===12.2&&pt("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async k(t){return this.db||(N(Kt,"Opening database:",this.name),this.db=await new Promise((e,n)=>{const s=indexedDB.open(this.name,this.version);s.onsuccess=i=>{const o=i.target.result;e(o)},s.onblocked=()=>{n(new Yr(t,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},s.onerror=i=>{const o=i.target.error;o.name==="VersionError"?n(new C(R.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new C(R.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new Yr(t,o))},s.onupgradeneeded=i=>{N(Kt,'Database "'+this.name+'" requires upgrade from version:',i.oldVersion);const o=i.target.result;if(this.L!==null&&this.L!==i.oldVersion)throw new Error(`refusing to open IndexedDB database due to potential corruption of the IndexedDB database data; this corruption could be caused by clicking the "clear site data" button in a web browser; try reloading the web page to re-initialize the IndexedDB database: lastClosedDbVersion=${this.L}, event.oldVersion=${i.oldVersion}, event.newVersion=${i.newVersion}, db.version=${o.version}`);this.B.q(o,s.transaction,i.oldVersion,this.version).next(()=>{N(Kt,"Database upgrade to version "+this.version+" complete")})}}),this.db.addEventListener("close",e=>{const n=e.target;this.L=n.version},{passive:!0})),this.db.addEventListener("versionchange",e=>{var n;e.newVersion===null&&(Ft('Received "versionchange" event with newVersion===null; notifying the registered DatabaseDeletedListener, if any'),(n=this.databaseDeletedListener)===null||n===void 0||n.call(this))},{passive:!0}),this.db}setDatabaseDeletedListener(t){if(this.databaseDeletedListener)throw new Error("setDatabaseDeletedListener() may only be called once, and it has already been called");this.databaseDeletedListener=t}async runTransaction(t,e,n,s){const i=e==="readonly";let o=0;for(;;){++o;try{this.db=await this.k(t);const u=zi.open(this.db,t,i?"readonly":"readwrite",n),c=s(u).next(h=>(u.v(),h)).catch(h=>(u.abort(h),A.reject(h))).toPromise();return c.catch(()=>{}),await u.D,c}catch(u){const c=u,h=c.name!=="FirebaseError"&&o<3;if(N(Kt,"Transaction failed with error:",c.message,"Retrying:",h),this.close(),!h)return Promise.reject(c)}}}close(){this.db&&this.db.close(),this.db=void 0}}function ed(r){const t=r.match(/Android ([\d.]+)/i),e=t?t[1].split(".").slice(0,2).join("."):"-1";return Number(e)}class c_{constructor(t){this.$=t,this.U=!1,this.K=null}get isDone(){return this.U}get W(){return this.K}set cursor(t){this.$=t}done(){this.U=!0}G(t){this.K=t}delete(){return sn(this.$.delete())}}class Yr extends C{constructor(t,e){super(R.UNAVAILABLE,`IndexedDB transaction '${t}' failed: ${e}`),this.name="IndexedDbTransactionError"}}function ze(r){return r.name==="IndexedDbTransactionError"}class l_{constructor(t){this.store=t}put(t,e){let n;return e!==void 0?(N(Kt,"PUT",this.store.name,t,e),n=this.store.put(e,t)):(N(Kt,"PUT",this.store.name,"<auto-key>",t),n=this.store.put(t)),sn(n)}add(t){return N(Kt,"ADD",this.store.name,t,t),sn(this.store.add(t))}get(t){return sn(this.store.get(t)).next(e=>(e===void 0&&(e=null),N(Kt,"GET",this.store.name,t,e),e))}delete(t){return N(Kt,"DELETE",this.store.name,t),sn(this.store.delete(t))}count(){return N(Kt,"COUNT",this.store.name),sn(this.store.count())}j(t,e){const n=this.options(t,e),s=n.index?this.store.index(n.index):this.store;if(typeof s.getAll=="function"){const i=s.getAll(n.range);return new A((o,u)=>{i.onerror=c=>{u(c.target.error)},i.onsuccess=c=>{o(c.target.result)}})}{const i=this.cursor(n),o=[];return this.J(i,(u,c)=>{o.push(c)}).next(()=>o)}}H(t,e){const n=this.store.getAll(t,e===null?void 0:e);return new A((s,i)=>{n.onerror=o=>{i(o.target.error)},n.onsuccess=o=>{s(o.target.result)}})}Y(t,e){N(Kt,"DELETE ALL",this.store.name);const n=this.options(t,e);n.Z=!1;const s=this.cursor(n);return this.J(s,(i,o,u)=>u.delete())}X(t,e){let n;e?n=t:(n={},e=t);const s=this.cursor(n);return this.J(s,e)}ee(t){const e=this.cursor({});return new A((n,s)=>{e.onerror=i=>{const o=Ma(i.target.error);s(o)},e.onsuccess=i=>{const o=i.target.result;o?t(o.primaryKey,o.value).next(u=>{u?o.continue():n()}):n()}})}J(t,e){const n=[];return new A((s,i)=>{t.onerror=o=>{i(o.target.error)},t.onsuccess=o=>{const u=o.target.result;if(!u)return void s();const c=new c_(u),h=e(u.primaryKey,u.value,c);if(h instanceof A){const f=h.catch(m=>(c.done(),A.reject(m)));n.push(f)}c.isDone?s():c.W===null?u.continue():u.continue(c.W)}}).next(()=>A.waitFor(n))}options(t,e){let n;return t!==void 0&&(typeof t=="string"?n=t:e=t),{index:n,range:e}}cursor(t){let e="next";if(t.reverse&&(e="prev"),t.index){const n=this.store.index(t.index);return t.Z?n.openKeyCursor(t.range,e):n.openCursor(t.range,e)}return this.store.openCursor(t.range,e)}}function sn(r){return new A((t,e)=>{r.onsuccess=n=>{const s=n.target.result;t(s)},r.onerror=n=>{const s=Ma(n.target.error);e(s)}})}let ol=!1;function Ma(r){const t=re.M(zn());if(t>=12.2&&t<13){const e="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(e)>=0){const n=new C("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${e}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return ol||(ol=!0,setTimeout(()=>{throw n},0)),n}}return r}const Zr="IndexBackfiller";class h_{constructor(t,e){this.asyncQueue=t,this.te=e,this.task=null}start(){this.ne(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}ne(t){N(Zr,`Scheduled in ${t}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",t,async()=>{this.task=null;try{const e=await this.te.re();N(Zr,`Documents written: ${e}`)}catch(e){ze(e)?N(Zr,"Ignoring IndexedDB error during index backfill: ",e):await je(e)}await this.ne(6e4)})}}class d_{constructor(t,e){this.localStore=t,this.persistence=e}async re(t=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",e=>this.ie(e,t))}ie(t,e){const n=new Set;let s=e,i=!0;return A.doWhile(()=>i===!0&&s>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(t).next(o=>{if(o!==null&&!n.has(o))return N(Zr,`Processing collection: ${o}`),this.se(t,o,s).next(u=>{s-=u,n.add(o)});i=!1})).next(()=>e-s)}se(t,e,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(t,e).next(s=>this.localStore.localDocuments.getNextDocuments(t,e,s,n).next(i=>{const o=i.changes;return this.localStore.indexManager.updateIndexEntries(t,o).next(()=>this.oe(s,i)).next(u=>(N(Zr,`Updating offset: ${u}`),this.localStore.indexManager.updateCollectionGroup(t,e,u))).next(()=>o.size)}))}oe(t,e){let n=t;return e.changes.forEach((s,i)=>{const o=Yh(i);Fa(o,n)>0&&(n=o)}),new Qt(n.readTime,n.documentKey,Math.max(e.batchId,t.largestBatchId))}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ut{constructor(t,e){this.previousValue=t,e&&(e.sequenceNumberHandler=n=>this._e(n),this.ae=n=>e.writeSequenceNumber(n))}_e(t){return this.previousValue=Math.max(t,this.previousValue),this.previousValue}next(){const t=++this.previousValue;return this.ae&&this.ae(t),t}}Ut.ue=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xe=-1;function vs(r){return r==null}function cs(r){return r===0&&1/r==-1/0}function nd(r){return typeof r=="number"&&Number.isInteger(r)&&!cs(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wi="";function kt(r){let t="";for(let e=0;e<r.length;e++)t.length>0&&(t=al(t)),t=f_(r.get(e),t);return al(t)}function f_(r,t){let e=t;const n=r.length;for(let s=0;s<n;s++){const i=r.charAt(s);switch(i){case"\0":e+="";break;case wi:e+="";break;default:e+=i}}return e}function al(r){return r+wi+""}function ee(r){const t=r.length;if(U(t>=2,64408,{path:r}),t===2)return U(r.charAt(0)===wi&&r.charAt(1)==="",56145,{path:r}),Q.emptyPath();const e=t-2,n=[];let s="";for(let i=0;i<t;){const o=r.indexOf(wi,i);switch((o<0||o>e)&&M(50515,{path:r}),r.charAt(o+1)){case"":const u=r.substring(i,o);let c;s.length===0?c=u:(s+=u,c=s,s=""),n.push(c);break;case"":s+=r.substring(i,o),s+="\0";break;case"":s+=r.substring(i,o+1);break;default:M(61167,{path:r})}i=o+2}return new Q(n)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rn="remoteDocuments",ws="owner",Dn="owner",ls="mutationQueues",m_="userId",Xt="mutations",ul="batchId",cn="userMutationsIndex",cl=["userId","batchId"];/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function li(r,t){return[r,kt(t)]}function rd(r,t,e){return[r,kt(t),e]}const p_={},Wn="documentMutations",Ai="remoteDocumentsV14",g_=["prefixPath","collectionGroup","readTime","documentId"],hi="documentKeyIndex",__=["prefixPath","collectionGroup","documentId"],sd="collectionGroupIndex",y_=["collectionGroup","readTime","prefixPath","documentId"],hs="remoteDocumentGlobal",aa="remoteDocumentGlobalKey",Hn="targets",id="queryTargetsIndex",I_=["canonicalId","targetId"],Xn="targetDocuments",E_=["targetId","path"],La="documentTargetsIndex",T_=["path","targetId"],bi="targetGlobalKey",hn="targetGlobal",ds="collectionParents",v_=["collectionId","parent"],Jn="clientMetadata",w_="clientId",$i="bundles",A_="bundleId",Gi="namedQueries",b_="name",Ba="indexConfiguration",R_="indexId",ua="collectionGroupIndex",S_="collectionGroup",ts="indexState",P_=["indexId","uid"],od="sequenceNumberIndex",V_=["uid","sequenceNumber"],es="indexEntries",C_=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],ad="documentKeyIndex",D_=["indexId","uid","orderedDocumentKey"],Ki="documentOverlays",x_=["userId","collectionPath","documentId"],ca="collectionPathOverlayIndex",N_=["userId","collectionPath","largestBatchId"],ud="collectionGroupOverlayIndex",k_=["userId","collectionGroup","largestBatchId"],Ua="globals",O_="name",cd=[ls,Xt,Wn,rn,Hn,ws,hn,Xn,Jn,hs,ds,$i,Gi],F_=[...cd,Ki],ld=[ls,Xt,Wn,Ai,Hn,ws,hn,Xn,Jn,hs,ds,$i,Gi,Ki],hd=ld,qa=[...hd,Ba,ts,es],M_=qa,dd=[...qa,Ua],L_=dd;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class la extends td{constructor(t,e){super(),this.ce=t,this.currentSequenceNumber=e}}function Tt(r,t){const e=O(r);return re.N(e.ce,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ll(r){let t=0;for(const e in r)Object.prototype.hasOwnProperty.call(r,e)&&t++;return t}function $e(r,t){for(const e in r)Object.prototype.hasOwnProperty.call(r,e)&&t(e,r[e])}function fd(r,t){const e=[];for(const n in r)Object.prototype.hasOwnProperty.call(r,n)&&e.push(t(r[n],n,r));return e}function md(r){for(const t in r)if(Object.prototype.hasOwnProperty.call(r,t))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ot{constructor(t,e){this.comparator=t,this.root=e||Rt.EMPTY}insert(t,e){return new ot(this.comparator,this.root.insert(t,e,this.comparator).copy(null,null,Rt.BLACK,null,null))}remove(t){return new ot(this.comparator,this.root.remove(t,this.comparator).copy(null,null,Rt.BLACK,null,null))}get(t){let e=this.root;for(;!e.isEmpty();){const n=this.comparator(t,e.key);if(n===0)return e.value;n<0?e=e.left:n>0&&(e=e.right)}return null}indexOf(t){let e=0,n=this.root;for(;!n.isEmpty();){const s=this.comparator(t,n.key);if(s===0)return e+n.left.size;s<0?n=n.left:(e+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(t){return this.root.inorderTraversal(t)}forEach(t){this.inorderTraversal((e,n)=>(t(e,n),!1))}toString(){const t=[];return this.inorderTraversal((e,n)=>(t.push(`${e}:${n}`),!1)),`{${t.join(", ")}}`}reverseTraversal(t){return this.root.reverseTraversal(t)}getIterator(){return new ni(this.root,null,this.comparator,!1)}getIteratorFrom(t){return new ni(this.root,t,this.comparator,!1)}getReverseIterator(){return new ni(this.root,null,this.comparator,!0)}getReverseIteratorFrom(t){return new ni(this.root,t,this.comparator,!0)}}class ni{constructor(t,e,n,s){this.isReverse=s,this.nodeStack=[];let i=1;for(;!t.isEmpty();)if(i=e?n(t.key,e):1,e&&s&&(i*=-1),i<0)t=this.isReverse?t.left:t.right;else{if(i===0){this.nodeStack.push(t);break}this.nodeStack.push(t),t=this.isReverse?t.right:t.left}}getNext(){let t=this.nodeStack.pop();const e={key:t.key,value:t.value};if(this.isReverse)for(t=t.left;!t.isEmpty();)this.nodeStack.push(t),t=t.right;else for(t=t.right;!t.isEmpty();)this.nodeStack.push(t),t=t.left;return e}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const t=this.nodeStack[this.nodeStack.length-1];return{key:t.key,value:t.value}}}class Rt{constructor(t,e,n,s,i){this.key=t,this.value=e,this.color=n??Rt.RED,this.left=s??Rt.EMPTY,this.right=i??Rt.EMPTY,this.size=this.left.size+1+this.right.size}copy(t,e,n,s,i){return new Rt(t??this.key,e??this.value,n??this.color,s??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(t){return this.left.inorderTraversal(t)||t(this.key,this.value)||this.right.inorderTraversal(t)}reverseTraversal(t){return this.right.reverseTraversal(t)||t(this.key,this.value)||this.left.reverseTraversal(t)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(t,e,n){let s=this;const i=n(t,s.key);return s=i<0?s.copy(null,null,null,s.left.insert(t,e,n),null):i===0?s.copy(null,e,null,null,null):s.copy(null,null,null,null,s.right.insert(t,e,n)),s.fixUp()}removeMin(){if(this.left.isEmpty())return Rt.EMPTY;let t=this;return t.left.isRed()||t.left.left.isRed()||(t=t.moveRedLeft()),t=t.copy(null,null,null,t.left.removeMin(),null),t.fixUp()}remove(t,e){let n,s=this;if(e(t,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(t,e),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),e(t,s.key)===0){if(s.right.isEmpty())return Rt.EMPTY;n=s.right.min(),s=s.copy(n.key,n.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(t,e))}return s.fixUp()}isRed(){return this.color}fixUp(){let t=this;return t.right.isRed()&&!t.left.isRed()&&(t=t.rotateLeft()),t.left.isRed()&&t.left.left.isRed()&&(t=t.rotateRight()),t.left.isRed()&&t.right.isRed()&&(t=t.colorFlip()),t}moveRedLeft(){let t=this.colorFlip();return t.right.left.isRed()&&(t=t.copy(null,null,null,null,t.right.rotateRight()),t=t.rotateLeft(),t=t.colorFlip()),t}moveRedRight(){let t=this.colorFlip();return t.left.left.isRed()&&(t=t.rotateRight(),t=t.colorFlip()),t}rotateLeft(){const t=this.copy(null,null,Rt.RED,null,this.right.left);return this.right.copy(null,null,this.color,t,null)}rotateRight(){const t=this.copy(null,null,Rt.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,t)}colorFlip(){const t=this.left.copy(null,null,!this.left.color,null,null),e=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,t,e)}checkMaxDepth(){const t=this.check();return Math.pow(2,t)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw M(43730,{key:this.key,value:this.value});if(this.right.isRed())throw M(14113,{key:this.key,value:this.value});const t=this.left.check();if(t!==this.right.check())throw M(27949);return t+(this.isRed()?0:1)}}Rt.EMPTY=null,Rt.RED=!0,Rt.BLACK=!1;Rt.EMPTY=new class{constructor(){this.size=0}get key(){throw M(57766)}get value(){throw M(16141)}get color(){throw M(16727)}get left(){throw M(29726)}get right(){throw M(36894)}copy(t,e,n,s,i){return this}insert(t,e,n){return new Rt(t,e)}remove(t,e){return this}isEmpty(){return!0}inorderTraversal(t){return!1}reverseTraversal(t){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rt{constructor(t){this.comparator=t,this.data=new ot(this.comparator)}has(t){return this.data.get(t)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(t){return this.data.indexOf(t)}forEach(t){this.data.inorderTraversal((e,n)=>(t(e),!1))}forEachInRange(t,e){const n=this.data.getIteratorFrom(t[0]);for(;n.hasNext();){const s=n.getNext();if(this.comparator(s.key,t[1])>=0)return;e(s.key)}}forEachWhile(t,e){let n;for(n=e!==void 0?this.data.getIteratorFrom(e):this.data.getIterator();n.hasNext();)if(!t(n.getNext().key))return}firstAfterOrEqual(t){const e=this.data.getIteratorFrom(t);return e.hasNext()?e.getNext().key:null}getIterator(){return new hl(this.data.getIterator())}getIteratorFrom(t){return new hl(this.data.getIteratorFrom(t))}add(t){return this.copy(this.data.remove(t).insert(t,!0))}delete(t){return this.has(t)?this.copy(this.data.remove(t)):this}isEmpty(){return this.data.isEmpty()}unionWith(t){let e=this;return e.size<t.size&&(e=t,t=this),t.forEach(n=>{e=e.add(n)}),e}isEqual(t){if(!(t instanceof rt)||this.size!==t.size)return!1;const e=this.data.getIterator(),n=t.data.getIterator();for(;e.hasNext();){const s=e.getNext().key,i=n.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const t=[];return this.forEach(e=>{t.push(e)}),t}toString(){const t=[];return this.forEach(e=>t.push(e)),"SortedSet("+t.toString()+")"}copy(t){const e=new rt(this.comparator);return e.data=t,e}}class hl{constructor(t){this.iter=t}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function xn(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qt{constructor(t){this.fields=t,t.sort(ct.comparator)}static empty(){return new qt([])}unionWith(t){let e=new rt(ct.comparator);for(const n of this.fields)e=e.add(n);for(const n of t)e=e.add(n);return new qt(e.toArray())}covers(t){for(const e of this.fields)if(e.isPrefixOf(t))return!0;return!1}isEqual(t){return $n(this.fields,t.fields,(e,n)=>e.isEqual(n))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pd extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function B_(){return typeof atob<"u"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ft{constructor(t){this.binaryString=t}static fromBase64String(t){const e=function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new pd("Invalid base64 string: "+i):i}}(t);return new ft(e)}static fromUint8Array(t){const e=function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i}(t);return new ft(e)}[Symbol.iterator](){let t=0;return{next:()=>t<this.binaryString.length?{value:this.binaryString.charCodeAt(t++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(e){return btoa(e)}(this.binaryString)}toUint8Array(){return function(e){const n=new Uint8Array(e.length);for(let s=0;s<e.length;s++)n[s]=e.charCodeAt(s);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(t){return z(this.binaryString,t.binaryString)}isEqual(t){return this.binaryString===t.binaryString}}ft.EMPTY_BYTE_STRING=new ft("");const U_=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function de(r){if(U(!!r,39018),typeof r=="string"){let t=0;const e=U_.exec(r);if(U(!!e,46558,{timestamp:r}),e[1]){let s=e[1];s=(s+"000000000").substr(0,9),t=Number(s)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:t}}return{seconds:lt(r.seconds),nanos:lt(r.nanos)}}function lt(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function fe(r){return typeof r=="string"?ft.fromBase64String(r):ft.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gd="server_timestamp",_d="__type__",yd="__previous_value__",Id="__local_write_time__";function Qi(r){var t,e;return((e=(((t=r?.mapValue)===null||t===void 0?void 0:t.fields)||{})[_d])===null||e===void 0?void 0:e.stringValue)===gd}function Wi(r){const t=r.mapValue.fields[yd];return Qi(t)?Wi(t):t}function fs(r){const t=de(r.mapValue.fields[Id].timestampValue);return new Z(t.seconds,t.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class q_{constructor(t,e,n,s,i,o,u,c,h,f){this.databaseId=t,this.appId=e,this.persistenceKey=n,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=u,this.longPollingOptions=c,this.useFetchStreams=h,this.isUsingEmulator=f}}const ms="(default)";class Oe{constructor(t,e){this.projectId=t,this.database=e||ms}static empty(){return new Oe("","")}get isDefaultDatabase(){return this.database===ms}isEqual(t){return t instanceof Oe&&t.projectId===this.projectId&&t.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ja="__type__",Ed="__max__",Se={mapValue:{fields:{__type__:{stringValue:Ed}}}},za="__vector__",Yn="value",di={nullValue:"NULL_VALUE"};function Fe(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?Qi(r)?4:Td(r)?9007199254740991:Hi(r)?10:11:M(28295,{value:r})}function ie(r,t){if(r===t)return!0;const e=Fe(r);if(e!==Fe(t))return!1;switch(e){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===t.booleanValue;case 4:return fs(r).isEqual(fs(t));case 3:return function(s,i){if(typeof s.timestampValue=="string"&&typeof i.timestampValue=="string"&&s.timestampValue.length===i.timestampValue.length)return s.timestampValue===i.timestampValue;const o=de(s.timestampValue),u=de(i.timestampValue);return o.seconds===u.seconds&&o.nanos===u.nanos}(r,t);case 5:return r.stringValue===t.stringValue;case 6:return function(s,i){return fe(s.bytesValue).isEqual(fe(i.bytesValue))}(r,t);case 7:return r.referenceValue===t.referenceValue;case 8:return function(s,i){return lt(s.geoPointValue.latitude)===lt(i.geoPointValue.latitude)&&lt(s.geoPointValue.longitude)===lt(i.geoPointValue.longitude)}(r,t);case 2:return function(s,i){if("integerValue"in s&&"integerValue"in i)return lt(s.integerValue)===lt(i.integerValue);if("doubleValue"in s&&"doubleValue"in i){const o=lt(s.doubleValue),u=lt(i.doubleValue);return o===u?cs(o)===cs(u):isNaN(o)&&isNaN(u)}return!1}(r,t);case 9:return $n(r.arrayValue.values||[],t.arrayValue.values||[],ie);case 10:case 11:return function(s,i){const o=s.mapValue.fields||{},u=i.mapValue.fields||{};if(ll(o)!==ll(u))return!1;for(const c in o)if(o.hasOwnProperty(c)&&(u[c]===void 0||!ie(o[c],u[c])))return!1;return!0}(r,t);default:return M(52216,{left:r})}}function ps(r,t){return(r.values||[]).find(e=>ie(e,t))!==void 0}function Me(r,t){if(r===t)return 0;const e=Fe(r),n=Fe(t);if(e!==n)return z(e,n);switch(e){case 0:case 9007199254740991:return 0;case 1:return z(r.booleanValue,t.booleanValue);case 2:return function(i,o){const u=lt(i.integerValue||i.doubleValue),c=lt(o.integerValue||o.doubleValue);return u<c?-1:u>c?1:u===c?0:isNaN(u)?isNaN(c)?0:-1:1}(r,t);case 3:return dl(r.timestampValue,t.timestampValue);case 4:return dl(fs(r),fs(t));case 5:return sa(r.stringValue,t.stringValue);case 6:return function(i,o){const u=fe(i),c=fe(o);return u.compareTo(c)}(r.bytesValue,t.bytesValue);case 7:return function(i,o){const u=i.split("/"),c=o.split("/");for(let h=0;h<u.length&&h<c.length;h++){const f=z(u[h],c[h]);if(f!==0)return f}return z(u.length,c.length)}(r.referenceValue,t.referenceValue);case 8:return function(i,o){const u=z(lt(i.latitude),lt(o.latitude));return u!==0?u:z(lt(i.longitude),lt(o.longitude))}(r.geoPointValue,t.geoPointValue);case 9:return fl(r.arrayValue,t.arrayValue);case 10:return function(i,o){var u,c,h,f;const m=i.fields||{},g=o.fields||{},w=(u=m[Yn])===null||u===void 0?void 0:u.arrayValue,V=(c=g[Yn])===null||c===void 0?void 0:c.arrayValue,D=z(((h=w?.values)===null||h===void 0?void 0:h.length)||0,((f=V?.values)===null||f===void 0?void 0:f.length)||0);return D!==0?D:fl(w,V)}(r.mapValue,t.mapValue);case 11:return function(i,o){if(i===Se.mapValue&&o===Se.mapValue)return 0;if(i===Se.mapValue)return 1;if(o===Se.mapValue)return-1;const u=i.fields||{},c=Object.keys(u),h=o.fields||{},f=Object.keys(h);c.sort(),f.sort();for(let m=0;m<c.length&&m<f.length;++m){const g=sa(c[m],f[m]);if(g!==0)return g;const w=Me(u[c[m]],h[f[m]]);if(w!==0)return w}return z(c.length,f.length)}(r.mapValue,t.mapValue);default:throw M(23264,{le:e})}}function dl(r,t){if(typeof r=="string"&&typeof t=="string"&&r.length===t.length)return z(r,t);const e=de(r),n=de(t),s=z(e.seconds,n.seconds);return s!==0?s:z(e.nanos,n.nanos)}function fl(r,t){const e=r.values||[],n=t.values||[];for(let s=0;s<e.length&&s<n.length;++s){const i=Me(e[s],n[s]);if(i)return i}return z(e.length,n.length)}function Zn(r){return ha(r)}function ha(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(e){const n=de(e);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(e){return fe(e).toBase64()}(r.bytesValue):"referenceValue"in r?function(e){return k.fromName(e).toString()}(r.referenceValue):"geoPointValue"in r?function(e){return`geo(${e.latitude},${e.longitude})`}(r.geoPointValue):"arrayValue"in r?function(e){let n="[",s=!0;for(const i of e.values||[])s?s=!1:n+=",",n+=ha(i);return n+"]"}(r.arrayValue):"mapValue"in r?function(e){const n=Object.keys(e.fields||{}).sort();let s="{",i=!0;for(const o of n)i?i=!1:s+=",",s+=`${o}:${ha(e.fields[o])}`;return s+"}"}(r.mapValue):M(61005,{value:r})}function fi(r){switch(Fe(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const t=Wi(r);return t?16+fi(t):16;case 5:return 2*r.stringValue.length;case 6:return fe(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return function(n){return(n.values||[]).reduce((s,i)=>s+fi(i),0)}(r.arrayValue);case 10:case 11:return function(n){let s=0;return $e(n.fields,(i,o)=>{s+=i.length+fi(o)}),s}(r.mapValue);default:throw M(13486,{value:r})}}function fn(r,t){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${t.path.canonicalString()}`}}function da(r){return!!r&&"integerValue"in r}function gs(r){return!!r&&"arrayValue"in r}function ml(r){return!!r&&"nullValue"in r}function pl(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function mi(r){return!!r&&"mapValue"in r}function Hi(r){var t,e;return((e=(((t=r?.mapValue)===null||t===void 0?void 0:t.fields)||{})[ja])===null||e===void 0?void 0:e.stringValue)===za}function ns(r){if(r.geoPointValue)return{geoPointValue:Object.assign({},r.geoPointValue)};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:Object.assign({},r.timestampValue)};if(r.mapValue){const t={mapValue:{fields:{}}};return $e(r.mapValue.fields,(e,n)=>t.mapValue.fields[e]=ns(n)),t}if(r.arrayValue){const t={arrayValue:{values:[]}};for(let e=0;e<(r.arrayValue.values||[]).length;++e)t.arrayValue.values[e]=ns(r.arrayValue.values[e]);return t}return Object.assign({},r)}function Td(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===Ed}const vd={mapValue:{fields:{[ja]:{stringValue:za},[Yn]:{arrayValue:{}}}}};function j_(r){return"nullValue"in r?di:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?fn(Oe.empty(),k.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?Hi(r)?vd:{mapValue:{}}:M(35942,{value:r})}function z_(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?fn(Oe.empty(),k.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?vd:"mapValue"in r?Hi(r)?{mapValue:{}}:Se:M(61959,{value:r})}function gl(r,t){const e=Me(r.value,t.value);return e!==0?e:r.inclusive&&!t.inclusive?-1:!r.inclusive&&t.inclusive?1:0}function _l(r,t){const e=Me(r.value,t.value);return e!==0?e:r.inclusive&&!t.inclusive?1:!r.inclusive&&t.inclusive?-1:0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class St{constructor(t){this.value=t}static empty(){return new St({mapValue:{}})}field(t){if(t.isEmpty())return this.value;{let e=this.value;for(let n=0;n<t.length-1;++n)if(e=(e.mapValue.fields||{})[t.get(n)],!mi(e))return null;return e=(e.mapValue.fields||{})[t.lastSegment()],e||null}}set(t,e){this.getFieldsMap(t.popLast())[t.lastSegment()]=ns(e)}setAll(t){let e=ct.emptyPath(),n={},s=[];t.forEach((o,u)=>{if(!e.isImmediateParentOf(u)){const c=this.getFieldsMap(e);this.applyChanges(c,n,s),n={},s=[],e=u.popLast()}o?n[u.lastSegment()]=ns(o):s.push(u.lastSegment())});const i=this.getFieldsMap(e);this.applyChanges(i,n,s)}delete(t){const e=this.field(t.popLast());mi(e)&&e.mapValue.fields&&delete e.mapValue.fields[t.lastSegment()]}isEqual(t){return ie(this.value,t.value)}getFieldsMap(t){let e=this.value;e.mapValue.fields||(e.mapValue={fields:{}});for(let n=0;n<t.length;++n){let s=e.mapValue.fields[t.get(n)];mi(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},e.mapValue.fields[t.get(n)]=s),e=s}return e.mapValue.fields}applyChanges(t,e,n){$e(e,(s,i)=>t[s]=i);for(const s of n)delete t[s]}clone(){return new St(ns(this.value))}}function wd(r){const t=[];return $e(r.fields,(e,n)=>{const s=new ct([e]);if(mi(n)){const i=wd(n.mapValue).fields;if(i.length===0)t.push(s);else for(const o of i)t.push(s.child(o))}else t.push(s)}),new qt(t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ut{constructor(t,e,n,s,i,o,u){this.key=t,this.documentType=e,this.version=n,this.readTime=s,this.createTime=i,this.data=o,this.documentState=u}static newInvalidDocument(t){return new ut(t,0,j.min(),j.min(),j.min(),St.empty(),0)}static newFoundDocument(t,e,n,s){return new ut(t,1,e,j.min(),n,s,0)}static newNoDocument(t,e){return new ut(t,2,e,j.min(),j.min(),St.empty(),0)}static newUnknownDocument(t,e){return new ut(t,3,e,j.min(),j.min(),St.empty(),2)}convertToFoundDocument(t,e){return!this.createTime.isEqual(j.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=t),this.version=t,this.documentType=1,this.data=e,this.documentState=0,this}convertToNoDocument(t){return this.version=t,this.documentType=2,this.data=St.empty(),this.documentState=0,this}convertToUnknownDocument(t){return this.version=t,this.documentType=3,this.data=St.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=j.min(),this}setReadTime(t){return this.readTime=t,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(t){return t instanceof ut&&this.key.isEqual(t.key)&&this.version.isEqual(t.version)&&this.documentType===t.documentType&&this.documentState===t.documentState&&this.data.isEqual(t.data)}mutableCopy(){return new ut(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Le{constructor(t,e){this.position=t,this.inclusive=e}}function yl(r,t,e){let n=0;for(let s=0;s<r.position.length;s++){const i=t[s],o=r.position[s];if(i.field.isKeyField()?n=k.comparator(k.fromName(o.referenceValue),e.key):n=Me(o,e.data.field(i.field)),i.dir==="desc"&&(n*=-1),n!==0)break}return n}function Il(r,t){if(r===null)return t===null;if(t===null||r.inclusive!==t.inclusive||r.position.length!==t.position.length)return!1;for(let e=0;e<r.position.length;e++)if(!ie(r.position[e],t.position[e]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _s{constructor(t,e="asc"){this.field=t,this.dir=e}}function $_(r,t){return r.dir===t.dir&&r.field.isEqual(t.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ad{}class H extends Ad{constructor(t,e,n){super(),this.field=t,this.op=e,this.value=n}static create(t,e,n){return t.isKeyField()?e==="in"||e==="not-in"?this.createKeyFieldInFilter(t,e,n):new G_(t,e,n):e==="array-contains"?new W_(t,n):e==="in"?new Cd(t,n):e==="not-in"?new H_(t,n):e==="array-contains-any"?new X_(t,n):new H(t,e,n)}static createKeyFieldInFilter(t,e,n){return e==="in"?new K_(t,n):new Q_(t,n)}matches(t){const e=t.data.field(this.field);return this.op==="!="?e!==null&&e.nullValue===void 0&&this.matchesComparison(Me(e,this.value)):e!==null&&Fe(this.value)===Fe(e)&&this.matchesComparison(Me(e,this.value))}matchesComparison(t){switch(this.op){case"<":return t<0;case"<=":return t<=0;case"==":return t===0;case"!=":return t!==0;case">":return t>0;case">=":return t>=0;default:return M(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class et extends Ad{constructor(t,e){super(),this.filters=t,this.op=e,this.he=null}static create(t,e){return new et(t,e)}matches(t){return tr(this)?this.filters.find(e=>!e.matches(t))===void 0:this.filters.find(e=>e.matches(t))!==void 0}getFlattenedFilters(){return this.he!==null||(this.he=this.filters.reduce((t,e)=>t.concat(e.getFlattenedFilters()),[])),this.he}getFilters(){return Object.assign([],this.filters)}}function tr(r){return r.op==="and"}function fa(r){return r.op==="or"}function $a(r){return bd(r)&&tr(r)}function bd(r){for(const t of r.filters)if(t instanceof et)return!1;return!0}function ma(r){if(r instanceof H)return r.field.canonicalString()+r.op.toString()+Zn(r.value);if($a(r))return r.filters.map(t=>ma(t)).join(",");{const t=r.filters.map(e=>ma(e)).join(",");return`${r.op}(${t})`}}function Rd(r,t){return r instanceof H?function(n,s){return s instanceof H&&n.op===s.op&&n.field.isEqual(s.field)&&ie(n.value,s.value)}(r,t):r instanceof et?function(n,s){return s instanceof et&&n.op===s.op&&n.filters.length===s.filters.length?n.filters.reduce((i,o,u)=>i&&Rd(o,s.filters[u]),!0):!1}(r,t):void M(19439)}function Sd(r,t){const e=r.filters.concat(t);return et.create(e,r.op)}function Pd(r){return r instanceof H?function(e){return`${e.field.canonicalString()} ${e.op} ${Zn(e.value)}`}(r):r instanceof et?function(e){return e.op.toString()+" {"+e.getFilters().map(Pd).join(" ,")+"}"}(r):"Filter"}class G_ extends H{constructor(t,e,n){super(t,e,n),this.key=k.fromName(n.referenceValue)}matches(t){const e=k.comparator(t.key,this.key);return this.matchesComparison(e)}}class K_ extends H{constructor(t,e){super(t,"in",e),this.keys=Vd("in",e)}matches(t){return this.keys.some(e=>e.isEqual(t.key))}}class Q_ extends H{constructor(t,e){super(t,"not-in",e),this.keys=Vd("not-in",e)}matches(t){return!this.keys.some(e=>e.isEqual(t.key))}}function Vd(r,t){var e;return(((e=t.arrayValue)===null||e===void 0?void 0:e.values)||[]).map(n=>k.fromName(n.referenceValue))}class W_ extends H{constructor(t,e){super(t,"array-contains",e)}matches(t){const e=t.data.field(this.field);return gs(e)&&ps(e.arrayValue,this.value)}}class Cd extends H{constructor(t,e){super(t,"in",e)}matches(t){const e=t.data.field(this.field);return e!==null&&ps(this.value.arrayValue,e)}}class H_ extends H{constructor(t,e){super(t,"not-in",e)}matches(t){if(ps(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const e=t.data.field(this.field);return e!==null&&e.nullValue===void 0&&!ps(this.value.arrayValue,e)}}class X_ extends H{constructor(t,e){super(t,"array-contains-any",e)}matches(t){const e=t.data.field(this.field);return!(!gs(e)||!e.arrayValue.values)&&e.arrayValue.values.some(n=>ps(this.value.arrayValue,n))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class J_{constructor(t,e=null,n=[],s=[],i=null,o=null,u=null){this.path=t,this.collectionGroup=e,this.orderBy=n,this.filters=s,this.limit=i,this.startAt=o,this.endAt=u,this.Pe=null}}function pa(r,t=null,e=[],n=[],s=null,i=null,o=null){return new J_(r,t,e,n,s,i,o)}function mn(r){const t=O(r);if(t.Pe===null){let e=t.path.canonicalString();t.collectionGroup!==null&&(e+="|cg:"+t.collectionGroup),e+="|f:",e+=t.filters.map(n=>ma(n)).join(","),e+="|ob:",e+=t.orderBy.map(n=>function(i){return i.field.canonicalString()+i.dir}(n)).join(","),vs(t.limit)||(e+="|l:",e+=t.limit),t.startAt&&(e+="|lb:",e+=t.startAt.inclusive?"b:":"a:",e+=t.startAt.position.map(n=>Zn(n)).join(",")),t.endAt&&(e+="|ub:",e+=t.endAt.inclusive?"a:":"b:",e+=t.endAt.position.map(n=>Zn(n)).join(",")),t.Pe=e}return t.Pe}function As(r,t){if(r.limit!==t.limit||r.orderBy.length!==t.orderBy.length)return!1;for(let e=0;e<r.orderBy.length;e++)if(!$_(r.orderBy[e],t.orderBy[e]))return!1;if(r.filters.length!==t.filters.length)return!1;for(let e=0;e<r.filters.length;e++)if(!Rd(r.filters[e],t.filters[e]))return!1;return r.collectionGroup===t.collectionGroup&&!!r.path.isEqual(t.path)&&!!Il(r.startAt,t.startAt)&&Il(r.endAt,t.endAt)}function Ri(r){return k.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function Si(r,t){return r.filters.filter(e=>e instanceof H&&e.field.isEqual(t))}function El(r,t,e){let n=di,s=!0;for(const i of Si(r,t)){let o=di,u=!0;switch(i.op){case"<":case"<=":o=j_(i.value);break;case"==":case"in":case">=":o=i.value;break;case">":o=i.value,u=!1;break;case"!=":case"not-in":o=di}gl({value:n,inclusive:s},{value:o,inclusive:u})<0&&(n=o,s=u)}if(e!==null){for(let i=0;i<r.orderBy.length;++i)if(r.orderBy[i].field.isEqual(t)){const o=e.position[i];gl({value:n,inclusive:s},{value:o,inclusive:e.inclusive})<0&&(n=o,s=e.inclusive);break}}return{value:n,inclusive:s}}function Tl(r,t,e){let n=Se,s=!0;for(const i of Si(r,t)){let o=Se,u=!0;switch(i.op){case">=":case">":o=z_(i.value),u=!1;break;case"==":case"in":case"<=":o=i.value;break;case"<":o=i.value,u=!1;break;case"!=":case"not-in":o=Se}_l({value:n,inclusive:s},{value:o,inclusive:u})>0&&(n=o,s=u)}if(e!==null){for(let i=0;i<r.orderBy.length;++i)if(r.orderBy[i].field.isEqual(t)){const o=e.position[i];_l({value:n,inclusive:s},{value:o,inclusive:e.inclusive})>0&&(n=o,s=e.inclusive);break}}return{value:n,inclusive:s}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class me{constructor(t,e=null,n=[],s=[],i=null,o="F",u=null,c=null){this.path=t,this.collectionGroup=e,this.explicitOrderBy=n,this.filters=s,this.limit=i,this.limitType=o,this.startAt=u,this.endAt=c,this.Te=null,this.Ie=null,this.de=null,this.startAt,this.endAt}}function Dd(r,t,e,n,s,i,o,u){return new me(r,t,e,n,s,i,o,u)}function fr(r){return new me(r)}function vl(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function Ga(r){return r.collectionGroup!==null}function qn(r){const t=O(r);if(t.Te===null){t.Te=[];const e=new Set;for(const i of t.explicitOrderBy)t.Te.push(i),e.add(i.field.canonicalString());const n=t.explicitOrderBy.length>0?t.explicitOrderBy[t.explicitOrderBy.length-1].dir:"asc";(function(o){let u=new rt(ct.comparator);return o.filters.forEach(c=>{c.getFlattenedFilters().forEach(h=>{h.isInequality()&&(u=u.add(h.field))})}),u})(t).forEach(i=>{e.has(i.canonicalString())||i.isKeyField()||t.Te.push(new _s(i,n))}),e.has(ct.keyField().canonicalString())||t.Te.push(new _s(ct.keyField(),n))}return t.Te}function Ot(r){const t=O(r);return t.Ie||(t.Ie=Nd(t,qn(r))),t.Ie}function xd(r){const t=O(r);return t.de||(t.de=Nd(t,r.explicitOrderBy)),t.de}function Nd(r,t){if(r.limitType==="F")return pa(r.path,r.collectionGroup,t,r.filters,r.limit,r.startAt,r.endAt);{t=t.map(s=>{const i=s.dir==="desc"?"asc":"desc";return new _s(s.field,i)});const e=r.endAt?new Le(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new Le(r.startAt.position,r.startAt.inclusive):null;return pa(r.path,r.collectionGroup,t,r.filters,r.limit,e,n)}}function ga(r,t){const e=r.filters.concat([t]);return new me(r.path,r.collectionGroup,r.explicitOrderBy.slice(),e,r.limit,r.limitType,r.startAt,r.endAt)}function Pi(r,t,e){return new me(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),t,e,r.startAt,r.endAt)}function bs(r,t){return As(Ot(r),Ot(t))&&r.limitType===t.limitType}function kd(r){return`${mn(Ot(r))}|lt:${r.limitType}`}function Ln(r){return`Query(target=${function(e){let n=e.path.canonicalString();return e.collectionGroup!==null&&(n+=" collectionGroup="+e.collectionGroup),e.filters.length>0&&(n+=`, filters: [${e.filters.map(s=>Pd(s)).join(", ")}]`),vs(e.limit)||(n+=", limit: "+e.limit),e.orderBy.length>0&&(n+=`, orderBy: [${e.orderBy.map(s=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(s)).join(", ")}]`),e.startAt&&(n+=", startAt: ",n+=e.startAt.inclusive?"b:":"a:",n+=e.startAt.position.map(s=>Zn(s)).join(",")),e.endAt&&(n+=", endAt: ",n+=e.endAt.inclusive?"a:":"b:",n+=e.endAt.position.map(s=>Zn(s)).join(",")),`Target(${n})`}(Ot(r))}; limitType=${r.limitType})`}function Rs(r,t){return t.isFoundDocument()&&function(n,s){const i=s.key.path;return n.collectionGroup!==null?s.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(i):k.isDocumentKey(n.path)?n.path.isEqual(i):n.path.isImmediateParentOf(i)}(r,t)&&function(n,s){for(const i of qn(n))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0}(r,t)&&function(n,s){for(const i of n.filters)if(!i.matches(s))return!1;return!0}(r,t)&&function(n,s){return!(n.startAt&&!function(o,u,c){const h=yl(o,u,c);return o.inclusive?h<=0:h<0}(n.startAt,qn(n),s)||n.endAt&&!function(o,u,c){const h=yl(o,u,c);return o.inclusive?h>=0:h>0}(n.endAt,qn(n),s))}(r,t)}function Od(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function Fd(r){return(t,e)=>{let n=!1;for(const s of qn(r)){const i=Y_(s,t,e);if(i!==0)return i;n=n||s.field.isKeyField()}return 0}}function Y_(r,t,e){const n=r.field.isKeyField()?k.comparator(t.key,e.key):function(i,o,u){const c=o.data.field(i),h=u.data.field(i);return c!==null&&h!==null?Me(c,h):M(42886)}(r.field,t,e);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return M(19790,{direction:r.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pe{constructor(t,e){this.mapKeyFn=t,this.equalsFn=e,this.inner={},this.innerSize=0}get(t){const e=this.mapKeyFn(t),n=this.inner[e];if(n!==void 0){for(const[s,i]of n)if(this.equalsFn(s,t))return i}}has(t){return this.get(t)!==void 0}set(t,e){const n=this.mapKeyFn(t),s=this.inner[n];if(s===void 0)return this.inner[n]=[[t,e]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],t))return void(s[i]=[t,e]);s.push([t,e]),this.innerSize++}delete(t){const e=this.mapKeyFn(t),n=this.inner[e];if(n===void 0)return!1;for(let s=0;s<n.length;s++)if(this.equalsFn(n[s][0],t))return n.length===1?delete this.inner[e]:n.splice(s,1),this.innerSize--,!0;return!1}forEach(t){$e(this.inner,(e,n)=>{for(const[s,i]of n)t(s,i)})}isEmpty(){return md(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Z_=new ot(k.comparator);function jt(){return Z_}const Md=new ot(k.comparator);function Qr(...r){let t=Md;for(const e of r)t=t.insert(e.key,e);return t}function Ld(r){let t=Md;return r.forEach((e,n)=>t=t.insert(e,n.overlayedDocument)),t}function ne(){return rs()}function Bd(){return rs()}function rs(){return new pe(r=>r.toString(),(r,t)=>r.isEqual(t))}const ty=new ot(k.comparator),ey=new rt(k.comparator);function $(...r){let t=ey;for(const e of r)t=t.add(e);return t}const ny=new rt(z);function Ka(){return ny}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qa(r,t){if(r.useProto3Json){if(isNaN(t))return{doubleValue:"NaN"};if(t===1/0)return{doubleValue:"Infinity"};if(t===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:cs(t)?"-0":t}}function Ud(r){return{integerValue:""+r}}function qd(r,t){return nd(t)?Ud(t):Qa(r,t)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xi{constructor(){this._=void 0}}function ry(r,t,e){return r instanceof er?function(s,i){const o={fields:{[_d]:{stringValue:gd},[Id]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&Qi(i)&&(i=Wi(i)),i&&(o.fields[yd]=i),{mapValue:o}}(e,t):r instanceof pn?zd(r,t):r instanceof gn?$d(r,t):function(s,i){const o=jd(s,i),u=wl(o)+wl(s.Ee);return da(o)&&da(s.Ee)?Ud(u):Qa(s.serializer,u)}(r,t)}function sy(r,t,e){return r instanceof pn?zd(r,t):r instanceof gn?$d(r,t):e}function jd(r,t){return r instanceof nr?function(n){return da(n)||function(i){return!!i&&"doubleValue"in i}(n)}(t)?t:{integerValue:0}:null}class er extends Xi{}class pn extends Xi{constructor(t){super(),this.elements=t}}function zd(r,t){const e=Gd(t);for(const n of r.elements)e.some(s=>ie(s,n))||e.push(n);return{arrayValue:{values:e}}}class gn extends Xi{constructor(t){super(),this.elements=t}}function $d(r,t){let e=Gd(t);for(const n of r.elements)e=e.filter(s=>!ie(s,n));return{arrayValue:{values:e}}}class nr extends Xi{constructor(t,e){super(),this.serializer=t,this.Ee=e}}function wl(r){return lt(r.integerValue||r.doubleValue)}function Gd(r){return gs(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ss{constructor(t,e){this.field=t,this.transform=e}}function iy(r,t){return r.field.isEqual(t.field)&&function(n,s){return n instanceof pn&&s instanceof pn||n instanceof gn&&s instanceof gn?$n(n.elements,s.elements,ie):n instanceof nr&&s instanceof nr?ie(n.Ee,s.Ee):n instanceof er&&s instanceof er}(r.transform,t.transform)}class oy{constructor(t,e){this.version=t,this.transformResults=e}}class ht{constructor(t,e){this.updateTime=t,this.exists=e}static none(){return new ht}static exists(t){return new ht(void 0,t)}static updateTime(t){return new ht(t)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(t){return this.exists===t.exists&&(this.updateTime?!!t.updateTime&&this.updateTime.isEqual(t.updateTime):!t.updateTime)}}function pi(r,t){return r.updateTime!==void 0?t.isFoundDocument()&&t.version.isEqual(r.updateTime):r.exists===void 0||r.exists===t.isFoundDocument()}class Ji{}function Kd(r,t){if(!r.hasLocalMutations||t&&t.fields.length===0)return null;if(t===null)return r.isNoDocument()?new pr(r.key,ht.none()):new mr(r.key,r.data,ht.none());{const e=r.data,n=St.empty();let s=new rt(ct.comparator);for(let i of t.fields)if(!s.has(i)){let o=e.field(i);o===null&&i.length>1&&(i=i.popLast(),o=e.field(i)),o===null?n.delete(i):n.set(i,o),s=s.add(i)}return new ge(r.key,n,new qt(s.toArray()),ht.none())}}function ay(r,t,e){r instanceof mr?function(s,i,o){const u=s.value.clone(),c=bl(s.fieldTransforms,i,o.transformResults);u.setAll(c),i.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(r,t,e):r instanceof ge?function(s,i,o){if(!pi(s.precondition,i))return void i.convertToUnknownDocument(o.version);const u=bl(s.fieldTransforms,i,o.transformResults),c=i.data;c.setAll(Qd(s)),c.setAll(u),i.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(r,t,e):function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()}(0,t,e)}function ss(r,t,e,n){return r instanceof mr?function(i,o,u,c){if(!pi(i.precondition,o))return u;const h=i.value.clone(),f=Rl(i.fieldTransforms,c,o);return h.setAll(f),o.convertToFoundDocument(o.version,h).setHasLocalMutations(),null}(r,t,e,n):r instanceof ge?function(i,o,u,c){if(!pi(i.precondition,o))return u;const h=Rl(i.fieldTransforms,c,o),f=o.data;return f.setAll(Qd(i)),f.setAll(h),o.convertToFoundDocument(o.version,f).setHasLocalMutations(),u===null?null:u.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map(m=>m.field))}(r,t,e,n):function(i,o,u){return pi(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):u}(r,t,e)}function uy(r,t){let e=null;for(const n of r.fieldTransforms){const s=t.data.field(n.field),i=jd(n.transform,s||null);i!=null&&(e===null&&(e=St.empty()),e.set(n.field,i))}return e||null}function Al(r,t){return r.type===t.type&&!!r.key.isEqual(t.key)&&!!r.precondition.isEqual(t.precondition)&&!!function(n,s){return n===void 0&&s===void 0||!(!n||!s)&&$n(n,s,(i,o)=>iy(i,o))}(r.fieldTransforms,t.fieldTransforms)&&(r.type===0?r.value.isEqual(t.value):r.type!==1||r.data.isEqual(t.data)&&r.fieldMask.isEqual(t.fieldMask))}class mr extends Ji{constructor(t,e,n,s=[]){super(),this.key=t,this.value=e,this.precondition=n,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class ge extends Ji{constructor(t,e,n,s,i=[]){super(),this.key=t,this.data=e,this.fieldMask=n,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function Qd(r){const t=new Map;return r.fieldMask.fields.forEach(e=>{if(!e.isEmpty()){const n=r.data.field(e);t.set(e,n)}}),t}function bl(r,t,e){const n=new Map;U(r.length===e.length,32656,{Ae:e.length,Re:r.length});for(let s=0;s<e.length;s++){const i=r[s],o=i.transform,u=t.data.field(i.field);n.set(i.field,sy(o,u,e[s]))}return n}function Rl(r,t,e){const n=new Map;for(const s of r){const i=s.transform,o=e.data.field(s.field);n.set(s.field,ry(i,o,t))}return n}class pr extends Ji{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Wa extends Ji{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ha{constructor(t,e,n,s){this.batchId=t,this.localWriteTime=e,this.baseMutations=n,this.mutations=s}applyToRemoteDocument(t,e){const n=e.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(t.key)&&ay(i,t,n[s])}}applyToLocalView(t,e){for(const n of this.baseMutations)n.key.isEqual(t.key)&&(e=ss(n,t,e,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(t.key)&&(e=ss(n,t,e,this.localWriteTime));return e}applyToLocalDocumentSet(t,e){const n=Bd();return this.mutations.forEach(s=>{const i=t.get(s.key),o=i.overlayedDocument;let u=this.applyToLocalView(o,i.mutatedFields);u=e.has(s.key)?null:u;const c=Kd(o,u);c!==null&&n.set(s.key,c),o.isValidDocument()||o.convertToNoDocument(j.min())}),n}keys(){return this.mutations.reduce((t,e)=>t.add(e.key),$())}isEqual(t){return this.batchId===t.batchId&&$n(this.mutations,t.mutations,(e,n)=>Al(e,n))&&$n(this.baseMutations,t.baseMutations,(e,n)=>Al(e,n))}}class Xa{constructor(t,e,n,s){this.batch=t,this.commitVersion=e,this.mutationResults=n,this.docVersions=s}static from(t,e,n){U(t.mutations.length===n.length,58842,{Ve:t.mutations.length,me:n.length});let s=function(){return ty}();const i=t.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,n[o].version);return new Xa(t,e,n,s)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ja{constructor(t,e){this.largestBatchId=t,this.mutation=e}getKey(){return this.mutation.key}isEqual(t){return t!==null&&this.mutation===t.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wd{constructor(t,e,n){this.alias=t,this.aggregateType=e,this.fieldPath=n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cy{constructor(t,e){this.count=t,this.unchangedNames=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var _t,X;function Hd(r){switch(r){case R.OK:return M(64938);case R.CANCELLED:case R.UNKNOWN:case R.DEADLINE_EXCEEDED:case R.RESOURCE_EXHAUSTED:case R.INTERNAL:case R.UNAVAILABLE:case R.UNAUTHENTICATED:return!1;case R.INVALID_ARGUMENT:case R.NOT_FOUND:case R.ALREADY_EXISTS:case R.PERMISSION_DENIED:case R.FAILED_PRECONDITION:case R.ABORTED:case R.OUT_OF_RANGE:case R.UNIMPLEMENTED:case R.DATA_LOSS:return!0;default:return M(15467,{code:r})}}function Xd(r){if(r===void 0)return pt("GRPC error has no .code"),R.UNKNOWN;switch(r){case _t.OK:return R.OK;case _t.CANCELLED:return R.CANCELLED;case _t.UNKNOWN:return R.UNKNOWN;case _t.DEADLINE_EXCEEDED:return R.DEADLINE_EXCEEDED;case _t.RESOURCE_EXHAUSTED:return R.RESOURCE_EXHAUSTED;case _t.INTERNAL:return R.INTERNAL;case _t.UNAVAILABLE:return R.UNAVAILABLE;case _t.UNAUTHENTICATED:return R.UNAUTHENTICATED;case _t.INVALID_ARGUMENT:return R.INVALID_ARGUMENT;case _t.NOT_FOUND:return R.NOT_FOUND;case _t.ALREADY_EXISTS:return R.ALREADY_EXISTS;case _t.PERMISSION_DENIED:return R.PERMISSION_DENIED;case _t.FAILED_PRECONDITION:return R.FAILED_PRECONDITION;case _t.ABORTED:return R.ABORTED;case _t.OUT_OF_RANGE:return R.OUT_OF_RANGE;case _t.UNIMPLEMENTED:return R.UNIMPLEMENTED;case _t.DATA_LOSS:return R.DATA_LOSS;default:return M(39323,{code:r})}}(X=_t||(_t={}))[X.OK=0]="OK",X[X.CANCELLED=1]="CANCELLED",X[X.UNKNOWN=2]="UNKNOWN",X[X.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",X[X.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",X[X.NOT_FOUND=5]="NOT_FOUND",X[X.ALREADY_EXISTS=6]="ALREADY_EXISTS",X[X.PERMISSION_DENIED=7]="PERMISSION_DENIED",X[X.UNAUTHENTICATED=16]="UNAUTHENTICATED",X[X.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",X[X.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",X[X.ABORTED=10]="ABORTED",X[X.OUT_OF_RANGE=11]="OUT_OF_RANGE",X[X.UNIMPLEMENTED=12]="UNIMPLEMENTED",X[X.INTERNAL=13]="INTERNAL",X[X.UNAVAILABLE=14]="UNAVAILABLE",X[X.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Vi=null;/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ly=new De([4294967295,4294967295],0);function Sl(r){const t=ka().encode(r),e=new Lh;return e.update(t),new Uint8Array(e.digest())}function Pl(r){const t=new DataView(r.buffer),e=t.getUint32(0,!0),n=t.getUint32(4,!0),s=t.getUint32(8,!0),i=t.getUint32(12,!0);return[new De([e,n],0),new De([s,i],0)]}class Ya{constructor(t,e,n){if(this.bitmap=t,this.padding=e,this.hashCount=n,e<0||e>=8)throw new Wr(`Invalid padding: ${e}`);if(n<0)throw new Wr(`Invalid hash count: ${n}`);if(t.length>0&&this.hashCount===0)throw new Wr(`Invalid hash count: ${n}`);if(t.length===0&&e!==0)throw new Wr(`Invalid padding when bitmap length is 0: ${e}`);this.fe=8*t.length-e,this.ge=De.fromNumber(this.fe)}pe(t,e,n){let s=t.add(e.multiply(De.fromNumber(n)));return s.compare(ly)===1&&(s=new De([s.getBits(0),s.getBits(1)],0)),s.modulo(this.ge).toNumber()}ye(t){return!!(this.bitmap[Math.floor(t/8)]&1<<t%8)}mightContain(t){if(this.fe===0)return!1;const e=Sl(t),[n,s]=Pl(e);for(let i=0;i<this.hashCount;i++){const o=this.pe(n,s,i);if(!this.ye(o))return!1}return!0}static create(t,e,n){const s=t%8==0?0:8-t%8,i=new Uint8Array(Math.ceil(t/8)),o=new Ya(i,s,e);return n.forEach(u=>o.insert(u)),o}insert(t){if(this.fe===0)return;const e=Sl(t),[n,s]=Pl(e);for(let i=0;i<this.hashCount;i++){const o=this.pe(n,s,i);this.we(o)}}we(t){const e=Math.floor(t/8),n=t%8;this.bitmap[e]|=1<<n}}class Wr extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ps{constructor(t,e,n,s,i){this.snapshotVersion=t,this.targetChanges=e,this.targetMismatches=n,this.documentUpdates=s,this.resolvedLimboDocuments=i}static createSynthesizedRemoteEventForCurrentChange(t,e,n){const s=new Map;return s.set(t,Vs.createSynthesizedTargetChangeForCurrentChange(t,e,n)),new Ps(j.min(),s,new ot(z),jt(),$())}}class Vs{constructor(t,e,n,s,i){this.resumeToken=t,this.current=e,this.addedDocuments=n,this.modifiedDocuments=s,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(t,e,n){return new Vs(n,e,$(),$(),$())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gi{constructor(t,e,n,s){this.Se=t,this.removedTargetIds=e,this.key=n,this.be=s}}class Jd{constructor(t,e){this.targetId=t,this.De=e}}class Yd{constructor(t,e,n=ft.EMPTY_BYTE_STRING,s=null){this.state=t,this.targetIds=e,this.resumeToken=n,this.cause=s}}class Vl{constructor(){this.ve=0,this.Ce=Cl(),this.Fe=ft.EMPTY_BYTE_STRING,this.Me=!1,this.xe=!0}get current(){return this.Me}get resumeToken(){return this.Fe}get Oe(){return this.ve!==0}get Ne(){return this.xe}Be(t){t.approximateByteSize()>0&&(this.xe=!0,this.Fe=t)}Le(){let t=$(),e=$(),n=$();return this.Ce.forEach((s,i)=>{switch(i){case 0:t=t.add(s);break;case 2:e=e.add(s);break;case 1:n=n.add(s);break;default:M(38017,{changeType:i})}}),new Vs(this.Fe,this.Me,t,e,n)}ke(){this.xe=!1,this.Ce=Cl()}qe(t,e){this.xe=!0,this.Ce=this.Ce.insert(t,e)}Qe(t){this.xe=!0,this.Ce=this.Ce.remove(t)}$e(){this.ve+=1}Ue(){this.ve-=1,U(this.ve>=0,3241,{ve:this.ve})}Ke(){this.xe=!0,this.Me=!0}}class hy{constructor(t){this.We=t,this.Ge=new Map,this.ze=jt(),this.je=ri(),this.Je=ri(),this.He=new ot(z)}Ye(t){for(const e of t.Se)t.be&&t.be.isFoundDocument()?this.Ze(e,t.be):this.Xe(e,t.key,t.be);for(const e of t.removedTargetIds)this.Xe(e,t.key,t.be)}et(t){this.forEachTarget(t,e=>{const n=this.tt(e);switch(t.state){case 0:this.nt(e)&&n.Be(t.resumeToken);break;case 1:n.Ue(),n.Oe||n.ke(),n.Be(t.resumeToken);break;case 2:n.Ue(),n.Oe||this.removeTarget(e);break;case 3:this.nt(e)&&(n.Ke(),n.Be(t.resumeToken));break;case 4:this.nt(e)&&(this.rt(e),n.Be(t.resumeToken));break;default:M(56790,{state:t.state})}})}forEachTarget(t,e){t.targetIds.length>0?t.targetIds.forEach(e):this.Ge.forEach((n,s)=>{this.nt(s)&&e(s)})}it(t){const e=t.targetId,n=t.De.count,s=this.st(e);if(s){const i=s.target;if(Ri(i))if(n===0){const o=new k(i.path);this.Xe(e,o,ut.newNoDocument(o,j.min()))}else U(n===1,20013,{expectedCount:n});else{const o=this.ot(e);if(o!==n){const u=this._t(t),c=u?this.ut(u,t,o):1;if(c!==0){this.rt(e);const h=c===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.He=this.He.insert(e,h)}Vi?.ct(function(f,m,g,w,V){var D,x,L,q,B,K;const tt={localCacheCount:f,existenceFilterCount:m.count,databaseId:g.database,projectId:g.projectId},G=m.unchangedNames;return G&&(tt.bloomFilter={applied:V===0,hashCount:(D=G?.hashCount)!==null&&D!==void 0?D:0,bitmapLength:(q=(L=(x=G?.bits)===null||x===void 0?void 0:x.bitmap)===null||L===void 0?void 0:L.length)!==null&&q!==void 0?q:0,padding:(K=(B=G?.bits)===null||B===void 0?void 0:B.padding)!==null&&K!==void 0?K:0,mightContain:E=>{var _;return(_=w?.mightContain(E))!==null&&_!==void 0&&_}}),tt}(o,t.De,this.We.lt(),u,c))}}}}_t(t){const e=t.De.unchangedNames;if(!e||!e.bits)return null;const{bits:{bitmap:n="",padding:s=0},hashCount:i=0}=e;let o,u;try{o=fe(n).toUint8Array()}catch(c){if(c instanceof pd)return Ft("Decoding the base64 bloom filter in existence filter failed ("+c.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw c}try{u=new Ya(o,s,i)}catch(c){return Ft(c instanceof Wr?"BloomFilter error: ":"Applying bloom filter failed: ",c),null}return u.fe===0?null:u}ut(t,e,n){return e.De.count===n-this.ht(t,e.targetId)?0:2}ht(t,e){const n=this.We.getRemoteKeysForTarget(e);let s=0;return n.forEach(i=>{const o=this.We.lt(),u=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;t.mightContain(u)||(this.Xe(e,i,null),s++)}),s}Pt(t){const e=new Map;this.Ge.forEach((i,o)=>{const u=this.st(o);if(u){if(i.current&&Ri(u.target)){const c=new k(u.target.path);this.Tt(c).has(o)||this.It(o,c)||this.Xe(o,c,ut.newNoDocument(c,t))}i.Ne&&(e.set(o,i.Le()),i.ke())}});let n=$();this.Je.forEach((i,o)=>{let u=!0;o.forEachWhile(c=>{const h=this.st(c);return!h||h.purpose==="TargetPurposeLimboResolution"||(u=!1,!1)}),u&&(n=n.add(i))}),this.ze.forEach((i,o)=>o.setReadTime(t));const s=new Ps(t,e,this.He,this.ze,n);return this.ze=jt(),this.je=ri(),this.Je=ri(),this.He=new ot(z),s}Ze(t,e){if(!this.nt(t))return;const n=this.It(t,e.key)?2:0;this.tt(t).qe(e.key,n),this.ze=this.ze.insert(e.key,e),this.je=this.je.insert(e.key,this.Tt(e.key).add(t)),this.Je=this.Je.insert(e.key,this.dt(e.key).add(t))}Xe(t,e,n){if(!this.nt(t))return;const s=this.tt(t);this.It(t,e)?s.qe(e,1):s.Qe(e),this.Je=this.Je.insert(e,this.dt(e).delete(t)),this.Je=this.Je.insert(e,this.dt(e).add(t)),n&&(this.ze=this.ze.insert(e,n))}removeTarget(t){this.Ge.delete(t)}ot(t){const e=this.tt(t).Le();return this.We.getRemoteKeysForTarget(t).size+e.addedDocuments.size-e.removedDocuments.size}$e(t){this.tt(t).$e()}tt(t){let e=this.Ge.get(t);return e||(e=new Vl,this.Ge.set(t,e)),e}dt(t){let e=this.Je.get(t);return e||(e=new rt(z),this.Je=this.Je.insert(t,e)),e}Tt(t){let e=this.je.get(t);return e||(e=new rt(z),this.je=this.je.insert(t,e)),e}nt(t){const e=this.st(t)!==null;return e||N("WatchChangeAggregator","Detected inactive target",t),e}st(t){const e=this.Ge.get(t);return e&&e.Oe?null:this.We.Et(t)}rt(t){this.Ge.set(t,new Vl),this.We.getRemoteKeysForTarget(t).forEach(e=>{this.Xe(t,e,null)})}It(t,e){return this.We.getRemoteKeysForTarget(t).has(e)}}function ri(){return new ot(k.comparator)}function Cl(){return new ot(k.comparator)}const dy={asc:"ASCENDING",desc:"DESCENDING"},fy={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},my={and:"AND",or:"OR"};class py{constructor(t,e){this.databaseId=t,this.useProto3Json=e}}function _a(r,t){return r.useProto3Json||vs(t)?t:{value:t}}function rr(r,t){return r.useProto3Json?`${new Date(1e3*t.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+t.nanoseconds).slice(-9)}Z`:{seconds:""+t.seconds,nanos:t.nanoseconds}}function Zd(r,t){return r.useProto3Json?t.toBase64():t.toUint8Array()}function gy(r,t){return rr(r,t.toTimestamp())}function gt(r){return U(!!r,49232),j.fromTimestamp(function(e){const n=de(e);return new Z(n.seconds,n.nanos)}(r))}function Za(r,t){return ya(r,t).canonicalString()}function ya(r,t){const e=function(s){return new Q(["projects",s.projectId,"databases",s.database])}(r).child("documents");return t===void 0?e:e.child(t)}function tf(r){const t=Q.fromString(r);return U(lf(t),10190,{key:t.toString()}),t}function ys(r,t){return Za(r.databaseId,t.path)}function se(r,t){const e=tf(t);if(e.get(1)!==r.databaseId.projectId)throw new C(R.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+e.get(1)+" vs "+r.databaseId.projectId);if(e.get(3)!==r.databaseId.database)throw new C(R.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+e.get(3)+" vs "+r.databaseId.database);return new k(rf(e))}function ef(r,t){return Za(r.databaseId,t)}function nf(r){const t=tf(r);return t.length===4?Q.emptyPath():rf(t)}function Ia(r){return new Q(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function rf(r){return U(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function Dl(r,t,e){return{name:ys(r,t),fields:e.value.mapValue.fields}}function Yi(r,t,e){const n=se(r,t.name),s=gt(t.updateTime),i=t.createTime?gt(t.createTime):j.min(),o=new St({mapValue:{fields:t.fields}}),u=ut.newFoundDocument(n,s,i,o);return e&&u.setHasCommittedMutations(),e?u.setHasCommittedMutations():u}function _y(r,t){return"found"in t?function(n,s){U(!!s.found,43571),s.found.name,s.found.updateTime;const i=se(n,s.found.name),o=gt(s.found.updateTime),u=s.found.createTime?gt(s.found.createTime):j.min(),c=new St({mapValue:{fields:s.found.fields}});return ut.newFoundDocument(i,o,u,c)}(r,t):"missing"in t?function(n,s){U(!!s.missing,3894),U(!!s.readTime,22933);const i=se(n,s.missing),o=gt(s.readTime);return ut.newNoDocument(i,o)}(r,t):M(7234,{result:t})}function yy(r,t){let e;if("targetChange"in t){t.targetChange;const n=function(h){return h==="NO_CHANGE"?0:h==="ADD"?1:h==="REMOVE"?2:h==="CURRENT"?3:h==="RESET"?4:M(39313,{state:h})}(t.targetChange.targetChangeType||"NO_CHANGE"),s=t.targetChange.targetIds||[],i=function(h,f){return h.useProto3Json?(U(f===void 0||typeof f=="string",58123),ft.fromBase64String(f||"")):(U(f===void 0||f instanceof Buffer||f instanceof Uint8Array,16193),ft.fromUint8Array(f||new Uint8Array))}(r,t.targetChange.resumeToken),o=t.targetChange.cause,u=o&&function(h){const f=h.code===void 0?R.UNKNOWN:Xd(h.code);return new C(f,h.message||"")}(o);e=new Yd(n,s,i,u||null)}else if("documentChange"in t){t.documentChange;const n=t.documentChange;n.document,n.document.name,n.document.updateTime;const s=se(r,n.document.name),i=gt(n.document.updateTime),o=n.document.createTime?gt(n.document.createTime):j.min(),u=new St({mapValue:{fields:n.document.fields}}),c=ut.newFoundDocument(s,i,o,u),h=n.targetIds||[],f=n.removedTargetIds||[];e=new gi(h,f,c.key,c)}else if("documentDelete"in t){t.documentDelete;const n=t.documentDelete;n.document;const s=se(r,n.document),i=n.readTime?gt(n.readTime):j.min(),o=ut.newNoDocument(s,i),u=n.removedTargetIds||[];e=new gi([],u,o.key,o)}else if("documentRemove"in t){t.documentRemove;const n=t.documentRemove;n.document;const s=se(r,n.document),i=n.removedTargetIds||[];e=new gi([],i,s,null)}else{if(!("filter"in t))return M(11601,{At:t});{t.filter;const n=t.filter;n.targetId;const{count:s=0,unchangedNames:i}=n,o=new cy(s,i),u=n.targetId;e=new Jd(u,o)}}return e}function Is(r,t){let e;if(t instanceof mr)e={update:Dl(r,t.key,t.value)};else if(t instanceof pr)e={delete:ys(r,t.key)};else if(t instanceof ge)e={update:Dl(r,t.key,t.data),updateMask:Ay(t.fieldMask)};else{if(!(t instanceof Wa))return M(16599,{Rt:t.type});e={verify:ys(r,t.key)}}return t.fieldTransforms.length>0&&(e.updateTransforms=t.fieldTransforms.map(n=>function(i,o){const u=o.transform;if(u instanceof er)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(u instanceof pn)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:u.elements}};if(u instanceof gn)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:u.elements}};if(u instanceof nr)return{fieldPath:o.field.canonicalString(),increment:u.Ee};throw M(20930,{transform:o.transform})}(0,n))),t.precondition.isNone||(e.currentDocument=function(s,i){return i.updateTime!==void 0?{updateTime:gy(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:M(27497)}(r,t.precondition)),e}function Ea(r,t){const e=t.currentDocument?function(i){return i.updateTime!==void 0?ht.updateTime(gt(i.updateTime)):i.exists!==void 0?ht.exists(i.exists):ht.none()}(t.currentDocument):ht.none(),n=t.updateTransforms?t.updateTransforms.map(s=>function(o,u){let c=null;if("setToServerValue"in u)U(u.setToServerValue==="REQUEST_TIME",16630,{proto:u}),c=new er;else if("appendMissingElements"in u){const f=u.appendMissingElements.values||[];c=new pn(f)}else if("removeAllFromArray"in u){const f=u.removeAllFromArray.values||[];c=new gn(f)}else"increment"in u?c=new nr(o,u.increment):M(16584,{proto:u});const h=ct.fromServerFormat(u.fieldPath);return new Ss(h,c)}(r,s)):[];if(t.update){t.update.name;const s=se(r,t.update.name),i=new St({mapValue:{fields:t.update.fields}});if(t.updateMask){const o=function(c){const h=c.fieldPaths||[];return new qt(h.map(f=>ct.fromServerFormat(f)))}(t.updateMask);return new ge(s,i,o,e,n)}return new mr(s,i,e,n)}if(t.delete){const s=se(r,t.delete);return new pr(s,e)}if(t.verify){const s=se(r,t.verify);return new Wa(s,e)}return M(1463,{proto:t})}function Iy(r,t){return r&&r.length>0?(U(t!==void 0,14353),r.map(e=>function(s,i){let o=s.updateTime?gt(s.updateTime):gt(i);return o.isEqual(j.min())&&(o=gt(i)),new oy(o,s.transformResults||[])}(e,t))):[]}function sf(r,t){return{documents:[ef(r,t.path)]}}function Zi(r,t){const e={structuredQuery:{}},n=t.path;let s;t.collectionGroup!==null?(s=n,e.structuredQuery.from=[{collectionId:t.collectionGroup,allDescendants:!0}]):(s=n.popLast(),e.structuredQuery.from=[{collectionId:n.lastSegment()}]),e.parent=ef(r,s);const i=function(h){if(h.length!==0)return cf(et.create(h,"and"))}(t.filters);i&&(e.structuredQuery.where=i);const o=function(h){if(h.length!==0)return h.map(f=>function(g){return{field:be(g.field),direction:Ty(g.dir)}}(f))}(t.orderBy);o&&(e.structuredQuery.orderBy=o);const u=_a(r,t.limit);return u!==null&&(e.structuredQuery.limit=u),t.startAt&&(e.structuredQuery.startAt=function(h){return{before:h.inclusive,values:h.position}}(t.startAt)),t.endAt&&(e.structuredQuery.endAt=function(h){return{before:!h.inclusive,values:h.position}}(t.endAt)),{Vt:e,parent:s}}function of(r,t,e,n){const{Vt:s,parent:i}=Zi(r,t),o={},u=[];let c=0;return e.forEach(h=>{const f=n?h.alias:"aggregate_"+c++;o[f]=h.alias,h.aggregateType==="count"?u.push({alias:f,count:{}}):h.aggregateType==="avg"?u.push({alias:f,avg:{field:be(h.fieldPath)}}):h.aggregateType==="sum"&&u.push({alias:f,sum:{field:be(h.fieldPath)}})}),{request:{structuredAggregationQuery:{aggregations:u,structuredQuery:s.structuredQuery},parent:s.parent},ft:o,parent:i}}function af(r){let t=nf(r.parent);const e=r.structuredQuery,n=e.from?e.from.length:0;let s=null;if(n>0){U(n===1,65062);const f=e.from[0];f.allDescendants?s=f.collectionId:t=t.child(f.collectionId)}let i=[];e.where&&(i=function(m){const g=uf(m);return g instanceof et&&$a(g)?g.getFilters():[g]}(e.where));let o=[];e.orderBy&&(o=function(m){return m.map(g=>function(V){return new _s(Bn(V.field),function(x){switch(x){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(V.direction))}(g))}(e.orderBy));let u=null;e.limit&&(u=function(m){let g;return g=typeof m=="object"?m.value:m,vs(g)?null:g}(e.limit));let c=null;e.startAt&&(c=function(m){const g=!!m.before,w=m.values||[];return new Le(w,g)}(e.startAt));let h=null;return e.endAt&&(h=function(m){const g=!m.before,w=m.values||[];return new Le(w,g)}(e.endAt)),Dd(t,s,o,i,u,"F",c,h)}function Ey(r,t){const e=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return M(28987,{purpose:s})}}(t.purpose);return e==null?null:{"goog-listen-tags":e}}function uf(r){return r.unaryFilter!==void 0?function(e){switch(e.unaryFilter.op){case"IS_NAN":const n=Bn(e.unaryFilter.field);return H.create(n,"==",{doubleValue:NaN});case"IS_NULL":const s=Bn(e.unaryFilter.field);return H.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=Bn(e.unaryFilter.field);return H.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Bn(e.unaryFilter.field);return H.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return M(61313);default:return M(60726)}}(r):r.fieldFilter!==void 0?function(e){return H.create(Bn(e.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return M(58110);default:return M(50506)}}(e.fieldFilter.op),e.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(e){return et.create(e.compositeFilter.filters.map(n=>uf(n)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return M(1026)}}(e.compositeFilter.op))}(r):M(30097,{filter:r})}function Ty(r){return dy[r]}function vy(r){return fy[r]}function wy(r){return my[r]}function be(r){return{fieldPath:r.canonicalString()}}function Bn(r){return ct.fromServerFormat(r.fieldPath)}function cf(r){return r instanceof H?function(e){if(e.op==="=="){if(pl(e.value))return{unaryFilter:{field:be(e.field),op:"IS_NAN"}};if(ml(e.value))return{unaryFilter:{field:be(e.field),op:"IS_NULL"}}}else if(e.op==="!="){if(pl(e.value))return{unaryFilter:{field:be(e.field),op:"IS_NOT_NAN"}};if(ml(e.value))return{unaryFilter:{field:be(e.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:be(e.field),op:vy(e.op),value:e.value}}}(r):r instanceof et?function(e){const n=e.getFilters().map(s=>cf(s));return n.length===1?n[0]:{compositeFilter:{op:wy(e.op),filters:n}}}(r):M(54877,{filter:r})}function Ay(r){const t=[];return r.fields.forEach(e=>t.push(e.canonicalString())),{fieldPaths:t}}function lf(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ce{constructor(t,e,n,s,i=j.min(),o=j.min(),u=ft.EMPTY_BYTE_STRING,c=null){this.target=t,this.targetId=e,this.purpose=n,this.sequenceNumber=s,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=u,this.expectedCount=c}withSequenceNumber(t){return new ce(this.target,this.targetId,this.purpose,t,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(t,e){return new ce(this.target,this.targetId,this.purpose,this.sequenceNumber,e,this.lastLimboFreeSnapshotVersion,t,null)}withExpectedCount(t){return new ce(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,t)}withLastLimboFreeSnapshotVersion(t){return new ce(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,t,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hf{constructor(t){this.gt=t}}function by(r,t){let e;if(t.document)e=Yi(r.gt,t.document,!!t.hasCommittedMutations);else if(t.noDocument){const n=k.fromSegments(t.noDocument.path),s=yn(t.noDocument.readTime);e=ut.newNoDocument(n,s),t.hasCommittedMutations&&e.setHasCommittedMutations()}else{if(!t.unknownDocument)return M(56709);{const n=k.fromSegments(t.unknownDocument.path),s=yn(t.unknownDocument.version);e=ut.newUnknownDocument(n,s)}}return t.readTime&&e.setReadTime(function(s){const i=new Z(s[0],s[1]);return j.fromTimestamp(i)}(t.readTime)),e}function xl(r,t){const e=t.key,n={prefixPath:e.getCollectionPath().popLast().toArray(),collectionGroup:e.collectionGroup,documentId:e.path.lastSegment(),readTime:Ci(t.readTime),hasCommittedMutations:t.hasCommittedMutations};if(t.isFoundDocument())n.document=function(i,o){return{name:ys(i,o.key),fields:o.data.value.mapValue.fields,updateTime:rr(i,o.version.toTimestamp()),createTime:rr(i,o.createTime.toTimestamp())}}(r.gt,t);else if(t.isNoDocument())n.noDocument={path:e.path.toArray(),readTime:_n(t.version)};else{if(!t.isUnknownDocument())return M(57904,{document:t});n.unknownDocument={path:e.path.toArray(),version:_n(t.version)}}return n}function Ci(r){const t=r.toTimestamp();return[t.seconds,t.nanoseconds]}function _n(r){const t=r.toTimestamp();return{seconds:t.seconds,nanoseconds:t.nanoseconds}}function yn(r){const t=new Z(r.seconds,r.nanoseconds);return j.fromTimestamp(t)}function on(r,t){const e=(t.baseMutations||[]).map(i=>Ea(r.gt,i));for(let i=0;i<t.mutations.length-1;++i){const o=t.mutations[i];if(i+1<t.mutations.length&&t.mutations[i+1].transform!==void 0){const u=t.mutations[i+1];o.updateTransforms=u.transform.fieldTransforms,t.mutations.splice(i+1,1),++i}}const n=t.mutations.map(i=>Ea(r.gt,i)),s=Z.fromMillis(t.localWriteTimeMs);return new Ha(t.batchId,s,e,n)}function Hr(r){const t=yn(r.readTime),e=r.lastLimboFreeSnapshotVersion!==void 0?yn(r.lastLimboFreeSnapshotVersion):j.min();let n;return n=function(i){return i.documents!==void 0}(r.query)?function(i){const o=i.documents.length;return U(o===1,1966,{count:o}),Ot(fr(nf(i.documents[0])))}(r.query):function(i){return Ot(af(i))}(r.query),new ce(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,t,e,ft.fromBase64String(r.resumeToken))}function df(r,t){const e=_n(t.snapshotVersion),n=_n(t.lastLimboFreeSnapshotVersion);let s;s=Ri(t.target)?sf(r.gt,t.target):Zi(r.gt,t.target).Vt;const i=t.resumeToken.toBase64();return{targetId:t.targetId,canonicalId:mn(t.target),readTime:e,resumeToken:i,lastListenSequenceNumber:t.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:s}}function to(r){const t=af({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?Pi(t,t.limit,"L"):t}function $o(r,t){return new Ja(t.largestBatchId,Ea(r.gt,t.overlayMutation))}function Nl(r,t){const e=t.path.lastSegment();return[r,kt(t.path.popLast()),e]}function kl(r,t,e,n){return{indexId:r,uid:t,sequenceNumber:e,readTime:_n(n.readTime),documentKey:kt(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ry{getBundleMetadata(t,e){return Ol(t).get(e).next(n=>{if(n)return function(i){return{id:i.bundleId,createTime:yn(i.createTime),version:i.version}}(n)})}saveBundleMetadata(t,e){return Ol(t).put(function(s){return{bundleId:s.id,createTime:_n(gt(s.createTime)),version:s.version}}(e))}getNamedQuery(t,e){return Fl(t).get(e).next(n=>{if(n)return function(i){return{name:i.name,query:to(i.bundledQuery),readTime:yn(i.readTime)}}(n)})}saveNamedQuery(t,e){return Fl(t).put(function(s){return{name:s.name,readTime:_n(gt(s.readTime)),bundledQuery:s.bundledQuery}}(e))}}function Ol(r){return Tt(r,$i)}function Fl(r){return Tt(r,Gi)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eo{constructor(t,e){this.serializer=t,this.userId=e}static yt(t,e){const n=e.uid||"";return new eo(t,n)}getOverlay(t,e){return qr(t).get(Nl(this.userId,e)).next(n=>n?$o(this.serializer,n):null)}getOverlays(t,e){const n=ne();return A.forEach(e,s=>this.getOverlay(t,s).next(i=>{i!==null&&n.set(s,i)})).next(()=>n)}saveOverlays(t,e,n){const s=[];return n.forEach((i,o)=>{const u=new Ja(e,o);s.push(this.wt(t,u))}),A.waitFor(s)}removeOverlaysForBatchId(t,e,n){const s=new Set;e.forEach(o=>s.add(kt(o.getCollectionPath())));const i=[];return s.forEach(o=>{const u=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);i.push(qr(t).Y(ca,u))}),A.waitFor(i)}getOverlaysForCollection(t,e,n){const s=ne(),i=kt(e),o=IDBKeyRange.bound([this.userId,i,n],[this.userId,i,Number.POSITIVE_INFINITY],!0);return qr(t).j(ca,o).next(u=>{for(const c of u){const h=$o(this.serializer,c);s.set(h.getKey(),h)}return s})}getOverlaysForCollectionGroup(t,e,n,s){const i=ne();let o;const u=IDBKeyRange.bound([this.userId,e,n],[this.userId,e,Number.POSITIVE_INFINITY],!0);return qr(t).X({index:ud,range:u},(c,h,f)=>{const m=$o(this.serializer,h);i.size()<s||m.largestBatchId===o?(i.set(m.getKey(),m),o=m.largestBatchId):f.done()}).next(()=>i)}wt(t,e){return qr(t).put(function(s,i,o){const[u,c,h]=Nl(i,o.mutation.key);return{userId:i,collectionPath:c,documentId:h,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:Is(s.gt,o.mutation)}}(this.serializer,this.userId,e))}}function qr(r){return Tt(r,Ki)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sy{St(t){return Tt(t,Ua)}getSessionToken(t){return this.St(t).get("sessionToken").next(e=>{const n=e?.value;return n?ft.fromUint8Array(n):ft.EMPTY_BYTE_STRING})}setSessionToken(t,e){return this.St(t).put({name:"sessionToken",value:e.toUint8Array()})}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class an{constructor(){}bt(t,e){this.Dt(t,e),e.vt()}Dt(t,e){if("nullValue"in t)this.Ct(e,5);else if("booleanValue"in t)this.Ct(e,10),e.Ft(t.booleanValue?1:0);else if("integerValue"in t)this.Ct(e,15),e.Ft(lt(t.integerValue));else if("doubleValue"in t){const n=lt(t.doubleValue);isNaN(n)?this.Ct(e,13):(this.Ct(e,15),cs(n)?e.Ft(0):e.Ft(n))}else if("timestampValue"in t){let n=t.timestampValue;this.Ct(e,20),typeof n=="string"&&(n=de(n)),e.Mt(`${n.seconds||""}`),e.Ft(n.nanos||0)}else if("stringValue"in t)this.xt(t.stringValue,e),this.Ot(e);else if("bytesValue"in t)this.Ct(e,30),e.Nt(fe(t.bytesValue)),this.Ot(e);else if("referenceValue"in t)this.Bt(t.referenceValue,e);else if("geoPointValue"in t){const n=t.geoPointValue;this.Ct(e,45),e.Ft(n.latitude||0),e.Ft(n.longitude||0)}else"mapValue"in t?Td(t)?this.Ct(e,Number.MAX_SAFE_INTEGER):Hi(t)?this.Lt(t.mapValue,e):(this.kt(t.mapValue,e),this.Ot(e)):"arrayValue"in t?(this.qt(t.arrayValue,e),this.Ot(e)):M(19022,{Qt:t})}xt(t,e){this.Ct(e,25),this.$t(t,e)}$t(t,e){e.Mt(t)}kt(t,e){const n=t.fields||{};this.Ct(e,55);for(const s of Object.keys(n))this.xt(s,e),this.Dt(n[s],e)}Lt(t,e){var n,s;const i=t.fields||{};this.Ct(e,53);const o=Yn,u=((s=(n=i[o].arrayValue)===null||n===void 0?void 0:n.values)===null||s===void 0?void 0:s.length)||0;this.Ct(e,15),e.Ft(lt(u)),this.xt(o,e),this.Dt(i[o],e)}qt(t,e){const n=t.values||[];this.Ct(e,50);for(const s of n)this.Dt(s,e)}Bt(t,e){this.Ct(e,37),k.fromName(t).path.forEach(n=>{this.Ct(e,60),this.$t(n,e)})}Ct(t,e){t.Ft(e)}Ot(t){t.Ft(2)}}an.Ut=new an;/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nn=255;function Py(r){if(r===0)return 8;let t=0;return r>>4||(t+=4,r<<=4),r>>6||(t+=2,r<<=2),r>>7||(t+=1),t}function Ml(r){const t=64-function(n){let s=0;for(let i=0;i<8;++i){const o=Py(255&n[i]);if(s+=o,o!==8)break}return s}(r);return Math.ceil(t/8)}class Vy{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Kt(t){const e=t[Symbol.iterator]();let n=e.next();for(;!n.done;)this.Wt(n.value),n=e.next();this.Gt()}zt(t){const e=t[Symbol.iterator]();let n=e.next();for(;!n.done;)this.jt(n.value),n=e.next();this.Jt()}Ht(t){for(const e of t){const n=e.charCodeAt(0);if(n<128)this.Wt(n);else if(n<2048)this.Wt(960|n>>>6),this.Wt(128|63&n);else if(e<"\uD800"||"\uDBFF"<e)this.Wt(480|n>>>12),this.Wt(128|63&n>>>6),this.Wt(128|63&n);else{const s=e.codePointAt(0);this.Wt(240|s>>>18),this.Wt(128|63&s>>>12),this.Wt(128|63&s>>>6),this.Wt(128|63&s)}}this.Gt()}Yt(t){for(const e of t){const n=e.charCodeAt(0);if(n<128)this.jt(n);else if(n<2048)this.jt(960|n>>>6),this.jt(128|63&n);else if(e<"\uD800"||"\uDBFF"<e)this.jt(480|n>>>12),this.jt(128|63&n>>>6),this.jt(128|63&n);else{const s=e.codePointAt(0);this.jt(240|s>>>18),this.jt(128|63&s>>>12),this.jt(128|63&s>>>6),this.jt(128|63&s)}}this.Jt()}Zt(t){const e=this.Xt(t),n=Ml(e);this.en(1+n),this.buffer[this.position++]=255&n;for(let s=e.length-n;s<e.length;++s)this.buffer[this.position++]=255&e[s]}tn(t){const e=this.Xt(t),n=Ml(e);this.en(1+n),this.buffer[this.position++]=~(255&n);for(let s=e.length-n;s<e.length;++s)this.buffer[this.position++]=~(255&e[s])}nn(){this.rn(Nn),this.rn(255)}sn(){this._n(Nn),this._n(255)}reset(){this.position=0}seed(t){this.en(t.length),this.buffer.set(t,this.position),this.position+=t.length}an(){return this.buffer.slice(0,this.position)}Xt(t){const e=function(i){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,i,!1),new Uint8Array(o.buffer)}(t),n=!!(128&e[0]);e[0]^=n?255:128;for(let s=1;s<e.length;++s)e[s]^=n?255:0;return e}Wt(t){const e=255&t;e===0?(this.rn(0),this.rn(255)):e===Nn?(this.rn(Nn),this.rn(0)):this.rn(e)}jt(t){const e=255&t;e===0?(this._n(0),this._n(255)):e===Nn?(this._n(Nn),this._n(0)):this._n(t)}Gt(){this.rn(0),this.rn(1)}Jt(){this._n(0),this._n(1)}rn(t){this.en(1),this.buffer[this.position++]=t}_n(t){this.en(1),this.buffer[this.position++]=~t}en(t){const e=t+this.position;if(e<=this.buffer.length)return;let n=2*this.buffer.length;n<e&&(n=e);const s=new Uint8Array(n);s.set(this.buffer),this.buffer=s}}class Cy{constructor(t){this.un=t}Nt(t){this.un.Kt(t)}Mt(t){this.un.Ht(t)}Ft(t){this.un.Zt(t)}vt(){this.un.nn()}}class Dy{constructor(t){this.un=t}Nt(t){this.un.zt(t)}Mt(t){this.un.Yt(t)}Ft(t){this.un.tn(t)}vt(){this.un.sn()}}class jr{constructor(){this.un=new Vy,this.cn=new Cy(this.un),this.ln=new Dy(this.un)}seed(t){this.un.seed(t)}hn(t){return t===0?this.cn:this.ln}an(){return this.un.an()}reset(){this.un.reset()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class un{constructor(t,e,n,s){this.Pn=t,this.Tn=e,this.In=n,this.dn=s}En(){const t=this.dn.length,e=t===0||this.dn[t-1]===255?t+1:t,n=new Uint8Array(e);return n.set(this.dn,0),e!==t?n.set([0],this.dn.length):++n[n.length-1],new un(this.Pn,this.Tn,this.In,n)}An(t,e,n){return{indexId:this.Pn,uid:t,arrayValue:_i(this.In),directionalValue:_i(this.dn),orderedDocumentKey:_i(e),documentKey:n.path.toArray()}}Rn(t,e,n){const s=this.An(t,e,n);return[s.indexId,s.uid,s.arrayValue,s.directionalValue,s.orderedDocumentKey,s.documentKey]}}function ve(r,t){let e=r.Pn-t.Pn;return e!==0?e:(e=Ll(r.In,t.In),e!==0?e:(e=Ll(r.dn,t.dn),e!==0?e:k.comparator(r.Tn,t.Tn)))}function Ll(r,t){for(let e=0;e<r.length&&e<t.length;++e){const n=r[e]-t[e];if(n!==0)return n}return r.length-t.length}function _i(r){return Ch()?function(e){let n="";for(let s=0;s<e.length;s++)n+=String.fromCharCode(e[s]);return n}(r):r}function Bl(r){return typeof r!="string"?r:function(e){const n=new Uint8Array(e.length);for(let s=0;s<e.length;s++)n[s]=e.charCodeAt(s);return n}(r)}class Ul{constructor(t){this.Vn=new rt((e,n)=>ct.comparator(e.field,n.field)),this.collectionId=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment(),this.mn=t.orderBy,this.fn=[];for(const e of t.filters){const n=e;n.isInequality()?this.Vn=this.Vn.add(n):this.fn.push(n)}}get gn(){return this.Vn.size>1}pn(t){if(U(t.collectionGroup===this.collectionId,49279),this.gn)return!1;const e=oa(t);if(e!==void 0&&!this.yn(e))return!1;const n=nn(t);let s=new Set,i=0,o=0;for(;i<n.length&&this.yn(n[i]);++i)s=s.add(n[i].fieldPath.canonicalString());if(i===n.length)return!0;if(this.Vn.size>0){const u=this.Vn.getIterator().getNext();if(!s.has(u.field.canonicalString())){const c=n[i];if(!this.wn(u,c)||!this.Sn(this.mn[o++],c))return!1}++i}for(;i<n.length;++i){const u=n[i];if(o>=this.mn.length||!this.Sn(this.mn[o++],u))return!1}return!0}bn(){if(this.gn)return null;let t=new rt(ct.comparator);const e=[];for(const n of this.fn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")e.push(new ln(n.field,2));else{if(t.has(n.field))continue;t=t.add(n.field),e.push(new ln(n.field,0))}for(const n of this.mn)n.field.isKeyField()||t.has(n.field)||(t=t.add(n.field),e.push(new ln(n.field,n.dir==="asc"?0:1)));return new Kn(Kn.UNKNOWN_ID,this.collectionId,e,Qn.empty())}yn(t){for(const e of this.fn)if(this.wn(e,t))return!0;return!1}wn(t,e){if(t===void 0||!t.field.isEqual(e.fieldPath))return!1;const n=t.op==="array-contains"||t.op==="array-contains-any";return e.kind===2===n}Sn(t,e){return!!t.field.isEqual(e.fieldPath)&&(e.kind===0&&t.dir==="asc"||e.kind===1&&t.dir==="desc")}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ff(r){var t,e;if(U(r instanceof H||r instanceof et,20012),r instanceof H){if(r instanceof Cd){const s=((e=(t=r.value.arrayValue)===null||t===void 0?void 0:t.values)===null||e===void 0?void 0:e.map(i=>H.create(r.field,"==",i)))||[];return et.create(s,"or")}return r}const n=r.filters.map(s=>ff(s));return et.create(n,r.op)}function xy(r){if(r.getFilters().length===0)return[];const t=wa(ff(r));return U(mf(t),7391),Ta(t)||va(t)?[t]:t.getFilters()}function Ta(r){return r instanceof H}function va(r){return r instanceof et&&$a(r)}function mf(r){return Ta(r)||va(r)||function(e){if(e instanceof et&&fa(e)){for(const n of e.getFilters())if(!Ta(n)&&!va(n))return!1;return!0}return!1}(r)}function wa(r){if(U(r instanceof H||r instanceof et,34018),r instanceof H)return r;if(r.filters.length===1)return wa(r.filters[0]);const t=r.filters.map(n=>wa(n));let e=et.create(t,r.op);return e=Di(e),mf(e)?e:(U(e instanceof et,64498),U(tr(e),40251),U(e.filters.length>1,57927),e.filters.reduce((n,s)=>tu(n,s)))}function tu(r,t){let e;return U(r instanceof H||r instanceof et,38388),U(t instanceof H||t instanceof et,25473),e=r instanceof H?t instanceof H?function(s,i){return et.create([s,i],"and")}(r,t):ql(r,t):t instanceof H?ql(t,r):function(s,i){if(U(s.filters.length>0&&i.filters.length>0,48005),tr(s)&&tr(i))return Sd(s,i.getFilters());const o=fa(s)?s:i,u=fa(s)?i:s,c=o.filters.map(h=>tu(h,u));return et.create(c,"or")}(r,t),Di(e)}function ql(r,t){if(tr(t))return Sd(t,r.getFilters());{const e=t.filters.map(n=>tu(r,n));return et.create(e,"or")}}function Di(r){if(U(r instanceof H||r instanceof et,11850),r instanceof H)return r;const t=r.getFilters();if(t.length===1)return Di(t[0]);if(bd(r))return r;const e=t.map(s=>Di(s)),n=[];return e.forEach(s=>{s instanceof H?n.push(s):s instanceof et&&(s.op===r.op?n.push(...s.filters):n.push(s))}),n.length===1?n[0]:et.create(n,r.op)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ny{constructor(){this.Dn=new eu}addToCollectionParentIndex(t,e){return this.Dn.add(e),A.resolve()}getCollectionParents(t,e){return A.resolve(this.Dn.getEntries(e))}addFieldIndex(t,e){return A.resolve()}deleteFieldIndex(t,e){return A.resolve()}deleteAllFieldIndexes(t){return A.resolve()}createTargetIndexes(t,e){return A.resolve()}getDocumentsMatchingTarget(t,e){return A.resolve(null)}getIndexType(t,e){return A.resolve(0)}getFieldIndexes(t,e){return A.resolve([])}getNextCollectionGroupToUpdate(t){return A.resolve(null)}getMinOffset(t,e){return A.resolve(Qt.min())}getMinOffsetFromCollectionGroup(t,e){return A.resolve(Qt.min())}updateCollectionGroup(t,e,n){return A.resolve()}updateIndexEntries(t,e){return A.resolve()}}class eu{constructor(){this.index={}}add(t){const e=t.lastSegment(),n=t.popLast(),s=this.index[e]||new rt(Q.comparator),i=!s.has(n);return this.index[e]=s.add(n),i}has(t){const e=t.lastSegment(),n=t.popLast(),s=this.index[e];return s&&s.has(n)}getEntries(t){return(this.index[t]||new rt(Q.comparator)).toArray()}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jl="IndexedDbIndexManager",si=new Uint8Array(0);class ky{constructor(t,e){this.databaseId=e,this.vn=new eu,this.Cn=new pe(n=>mn(n),(n,s)=>As(n,s)),this.uid=t.uid||""}addToCollectionParentIndex(t,e){if(!this.vn.has(e)){const n=e.lastSegment(),s=e.popLast();t.addOnCommittedListener(()=>{this.vn.add(e)});const i={collectionId:n,parent:kt(s)};return zl(t).put(i)}return A.resolve()}getCollectionParents(t,e){const n=[],s=IDBKeyRange.bound([e,""],[Qh(e),""],!1,!0);return zl(t).j(s).next(i=>{for(const o of i){if(o.collectionId!==e)break;n.push(ee(o.parent))}return n})}addFieldIndex(t,e){const n=zr(t),s=function(u){return{indexId:u.indexId,collectionGroup:u.collectionGroup,fields:u.fields.map(c=>[c.fieldPath.canonicalString(),c.kind])}}(e);delete s.indexId;const i=n.add(s);if(e.indexState){const o=On(t);return i.next(u=>{o.put(kl(u,this.uid,e.indexState.sequenceNumber,e.indexState.offset))})}return i.next()}deleteFieldIndex(t,e){const n=zr(t),s=On(t),i=kn(t);return n.delete(e.indexId).next(()=>s.delete(IDBKeyRange.bound([e.indexId],[e.indexId+1],!1,!0))).next(()=>i.delete(IDBKeyRange.bound([e.indexId],[e.indexId+1],!1,!0)))}deleteAllFieldIndexes(t){const e=zr(t),n=kn(t),s=On(t);return e.Y().next(()=>n.Y()).next(()=>s.Y())}createTargetIndexes(t,e){return A.forEach(this.Fn(e),n=>this.getIndexType(t,n).next(s=>{if(s===0||s===1){const i=new Ul(n).bn();if(i!=null)return this.addFieldIndex(t,i)}}))}getDocumentsMatchingTarget(t,e){const n=kn(t);let s=!0;const i=new Map;return A.forEach(this.Fn(e),o=>this.Mn(t,o).next(u=>{s&&(s=!!u),i.set(o,u)})).next(()=>{if(s){let o=$();const u=[];return A.forEach(i,(c,h)=>{N(jl,`Using index ${function(B){return`id=${B.indexId}|cg=${B.collectionGroup}|f=${B.fields.map(K=>`${K.fieldPath}:${K.kind}`).join(",")}`}(c)} to execute ${mn(e)}`);const f=function(B,K){const tt=oa(K);if(tt===void 0)return null;for(const G of Si(B,tt.fieldPath))switch(G.op){case"array-contains-any":return G.value.arrayValue.values||[];case"array-contains":return[G.value]}return null}(h,c),m=function(B,K){const tt=new Map;for(const G of nn(K))for(const E of Si(B,G.fieldPath))switch(E.op){case"==":case"in":tt.set(G.fieldPath.canonicalString(),E.value);break;case"not-in":case"!=":return tt.set(G.fieldPath.canonicalString(),E.value),Array.from(tt.values())}return null}(h,c),g=function(B,K){const tt=[];let G=!0;for(const E of nn(K)){const _=E.kind===0?El(B,E.fieldPath,B.startAt):Tl(B,E.fieldPath,B.startAt);tt.push(_.value),G&&(G=_.inclusive)}return new Le(tt,G)}(h,c),w=function(B,K){const tt=[];let G=!0;for(const E of nn(K)){const _=E.kind===0?Tl(B,E.fieldPath,B.endAt):El(B,E.fieldPath,B.endAt);tt.push(_.value),G&&(G=_.inclusive)}return new Le(tt,G)}(h,c),V=this.xn(c,h,g),D=this.xn(c,h,w),x=this.On(c,h,m),L=this.Nn(c.indexId,f,V,g.inclusive,D,w.inclusive,x);return A.forEach(L,q=>n.H(q,e.limit).next(B=>{B.forEach(K=>{const tt=k.fromSegments(K.documentKey);o.has(tt)||(o=o.add(tt),u.push(tt))})}))}).next(()=>u)}return A.resolve(null)})}Fn(t){let e=this.Cn.get(t);return e||(t.filters.length===0?e=[t]:e=xy(et.create(t.filters,"and")).map(n=>pa(t.path,t.collectionGroup,t.orderBy,n.getFilters(),t.limit,t.startAt,t.endAt)),this.Cn.set(t,e),e)}Nn(t,e,n,s,i,o,u){const c=(e!=null?e.length:1)*Math.max(n.length,i.length),h=c/(e!=null?e.length:1),f=[];for(let m=0;m<c;++m){const g=e?this.Bn(e[m/h]):si,w=this.Ln(t,g,n[m%h],s),V=this.kn(t,g,i[m%h],o),D=u.map(x=>this.Ln(t,g,x,!0));f.push(...this.createRange(w,V,D))}return f}Ln(t,e,n,s){const i=new un(t,k.empty(),e,n);return s?i:i.En()}kn(t,e,n,s){const i=new un(t,k.empty(),e,n);return s?i.En():i}Mn(t,e){const n=new Ul(e),s=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment();return this.getFieldIndexes(t,s).next(i=>{let o=null;for(const u of i)n.pn(u)&&(!o||u.fields.length>o.fields.length)&&(o=u);return o})}getIndexType(t,e){let n=2;const s=this.Fn(e);return A.forEach(s,i=>this.Mn(t,i).next(o=>{o?n!==0&&o.fields.length<function(c){let h=new rt(ct.comparator),f=!1;for(const m of c.filters)for(const g of m.getFlattenedFilters())g.field.isKeyField()||(g.op==="array-contains"||g.op==="array-contains-any"?f=!0:h=h.add(g.field));for(const m of c.orderBy)m.field.isKeyField()||(h=h.add(m.field));return h.size+(f?1:0)}(i)&&(n=1):n=0})).next(()=>function(o){return o.limit!==null}(e)&&s.length>1&&n===2?1:n)}qn(t,e){const n=new jr;for(const s of nn(t)){const i=e.data.field(s.fieldPath);if(i==null)return null;const o=n.hn(s.kind);an.Ut.bt(i,o)}return n.an()}Bn(t){const e=new jr;return an.Ut.bt(t,e.hn(0)),e.an()}Qn(t,e){const n=new jr;return an.Ut.bt(fn(this.databaseId,e),n.hn(function(i){const o=nn(i);return o.length===0?0:o[o.length-1].kind}(t))),n.an()}On(t,e,n){if(n===null)return[];let s=[];s.push(new jr);let i=0;for(const o of nn(t)){const u=n[i++];for(const c of s)if(this.$n(e,o.fieldPath)&&gs(u))s=this.Un(s,o,u);else{const h=c.hn(o.kind);an.Ut.bt(u,h)}}return this.Kn(s)}xn(t,e,n){return this.On(t,e,n.position)}Kn(t){const e=[];for(let n=0;n<t.length;++n)e[n]=t[n].an();return e}Un(t,e,n){const s=[...t],i=[];for(const o of n.arrayValue.values||[])for(const u of s){const c=new jr;c.seed(u.an()),an.Ut.bt(o,c.hn(e.kind)),i.push(c)}return i}$n(t,e){return!!t.filters.find(n=>n instanceof H&&n.field.isEqual(e)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(t,e){const n=zr(t),s=On(t);return(e?n.j(ua,IDBKeyRange.bound(e,e)):n.j()).next(i=>{const o=[];return A.forEach(i,u=>s.get([u.indexId,this.uid]).next(c=>{o.push(function(f,m){const g=m?new Qn(m.sequenceNumber,new Qt(yn(m.readTime),new k(ee(m.documentKey)),m.largestBatchId)):Qn.empty(),w=f.fields.map(([V,D])=>new ln(ct.fromServerFormat(V),D));return new Kn(f.indexId,f.collectionGroup,w,g)}(u,c))})).next(()=>o)})}getNextCollectionGroupToUpdate(t){return this.getFieldIndexes(t).next(e=>e.length===0?null:(e.sort((n,s)=>{const i=n.indexState.sequenceNumber-s.indexState.sequenceNumber;return i!==0?i:z(n.collectionGroup,s.collectionGroup)}),e[0].collectionGroup))}updateCollectionGroup(t,e,n){const s=zr(t),i=On(t);return this.Wn(t).next(o=>s.j(ua,IDBKeyRange.bound(e,e)).next(u=>A.forEach(u,c=>i.put(kl(c.indexId,this.uid,o,n)))))}updateIndexEntries(t,e){const n=new Map;return A.forEach(e,(s,i)=>{const o=n.get(s.collectionGroup);return(o?A.resolve(o):this.getFieldIndexes(t,s.collectionGroup)).next(u=>(n.set(s.collectionGroup,u),A.forEach(u,c=>this.Gn(t,s,c).next(h=>{const f=this.zn(i,c);return h.isEqual(f)?A.resolve():this.jn(t,i,c,h,f)}))))})}Jn(t,e,n,s){return kn(t).put(s.An(this.uid,this.Qn(n,e.key),e.key))}Hn(t,e,n,s){return kn(t).delete(s.Rn(this.uid,this.Qn(n,e.key),e.key))}Gn(t,e,n){const s=kn(t);let i=new rt(ve);return s.X({index:ad,range:IDBKeyRange.only([n.indexId,this.uid,_i(this.Qn(n,e))])},(o,u)=>{i=i.add(new un(n.indexId,e,Bl(u.arrayValue),Bl(u.directionalValue)))}).next(()=>i)}zn(t,e){let n=new rt(ve);const s=this.qn(e,t);if(s==null)return n;const i=oa(e);if(i!=null){const o=t.data.field(i.fieldPath);if(gs(o))for(const u of o.arrayValue.values||[])n=n.add(new un(e.indexId,t.key,this.Bn(u),s))}else n=n.add(new un(e.indexId,t.key,si,s));return n}jn(t,e,n,s,i){N(jl,"Updating index entries for document '%s'",e.key);const o=[];return function(c,h,f,m,g){const w=c.getIterator(),V=h.getIterator();let D=xn(w),x=xn(V);for(;D||x;){let L=!1,q=!1;if(D&&x){const B=f(D,x);B<0?q=!0:B>0&&(L=!0)}else D!=null?q=!0:L=!0;L?(m(x),x=xn(V)):q?(g(D),D=xn(w)):(D=xn(w),x=xn(V))}}(s,i,ve,u=>{o.push(this.Jn(t,e,n,u))},u=>{o.push(this.Hn(t,e,n,u))}),A.waitFor(o)}Wn(t){let e=1;return On(t).X({index:od,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,s,i)=>{i.done(),e=s.sequenceNumber+1}).next(()=>e)}createRange(t,e,n){n=n.sort((o,u)=>ve(o,u)).filter((o,u,c)=>!u||ve(o,c[u-1])!==0);const s=[];s.push(t);for(const o of n){const u=ve(o,t),c=ve(o,e);if(u===0)s[0]=t.En();else if(u>0&&c<0)s.push(o),s.push(o.En());else if(c>0)break}s.push(e);const i=[];for(let o=0;o<s.length;o+=2){if(this.Yn(s[o],s[o+1]))return[];const u=s[o].Rn(this.uid,si,k.empty()),c=s[o+1].Rn(this.uid,si,k.empty());i.push(IDBKeyRange.bound(u,c))}return i}Yn(t,e){return ve(t,e)>0}getMinOffsetFromCollectionGroup(t,e){return this.getFieldIndexes(t,e).next($l)}getMinOffset(t,e){return A.mapArray(this.Fn(e),n=>this.Mn(t,n).next(s=>s||M(44426))).next($l)}}function zl(r){return Tt(r,ds)}function kn(r){return Tt(r,es)}function zr(r){return Tt(r,Ba)}function On(r){return Tt(r,ts)}function $l(r){U(r.length!==0,28825);let t=r[0].indexState.offset,e=t.largestBatchId;for(let n=1;n<r.length;n++){const s=r[n].indexState.offset;Fa(s,t)<0&&(t=s),e<s.largestBatchId&&(e=s.largestBatchId)}return new Qt(t.readTime,t.documentKey,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gl={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},pf=41943040;class Nt{static withCacheSize(t){return new Nt(t,Nt.DEFAULT_COLLECTION_PERCENTILE,Nt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(t,e,n){this.cacheSizeCollectionThreshold=t,this.percentileToCollect=e,this.maximumSequenceNumbersToCollect=n}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gf(r,t,e){const n=r.store(Xt),s=r.store(Wn),i=[],o=IDBKeyRange.only(e.batchId);let u=0;const c=n.X({range:o},(f,m,g)=>(u++,g.delete()));i.push(c.next(()=>{U(u===1,47070,{batchId:e.batchId})}));const h=[];for(const f of e.mutations){const m=rd(t,f.key.path,e.batchId);i.push(s.delete(m)),h.push(f.key)}return A.waitFor(i).next(()=>h)}function xi(r){if(!r)return 0;let t;if(r.document)t=r.document;else if(r.unknownDocument)t=r.unknownDocument;else{if(!r.noDocument)throw M(14731);t=r.noDocument}return JSON.stringify(t).length}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Nt.DEFAULT_COLLECTION_PERCENTILE=10,Nt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Nt.DEFAULT=new Nt(pf,Nt.DEFAULT_COLLECTION_PERCENTILE,Nt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Nt.DISABLED=new Nt(-1,0,0);class no{constructor(t,e,n,s){this.userId=t,this.serializer=e,this.indexManager=n,this.referenceDelegate=s,this.Zn={}}static yt(t,e,n,s){U(t.uid!=="",64387);const i=t.isAuthenticated()?t.uid:"";return new no(i,e,n,s)}checkEmpty(t){let e=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return we(t).X({index:cn,range:n},(s,i,o)=>{e=!1,o.done()}).next(()=>e)}addMutationBatch(t,e,n,s){const i=Un(t),o=we(t);return o.add({}).next(u=>{U(typeof u=="number",49019);const c=new Ha(u,e,n,s),h=function(w,V,D){const x=D.baseMutations.map(q=>Is(w.gt,q)),L=D.mutations.map(q=>Is(w.gt,q));return{userId:V,batchId:D.batchId,localWriteTimeMs:D.localWriteTime.toMillis(),baseMutations:x,mutations:L}}(this.serializer,this.userId,c),f=[];let m=new rt((g,w)=>z(g.canonicalString(),w.canonicalString()));for(const g of s){const w=rd(this.userId,g.key.path,u);m=m.add(g.key.path.popLast()),f.push(o.put(h)),f.push(i.put(w,p_))}return m.forEach(g=>{f.push(this.indexManager.addToCollectionParentIndex(t,g))}),t.addOnCommittedListener(()=>{this.Zn[u]=c.keys()}),A.waitFor(f).next(()=>c)})}lookupMutationBatch(t,e){return we(t).get(e).next(n=>n?(U(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:e}),on(this.serializer,n)):null)}Xn(t,e){return this.Zn[e]?A.resolve(this.Zn[e]):this.lookupMutationBatch(t,e).next(n=>{if(n){const s=n.keys();return this.Zn[e]=s,s}return null})}getNextMutationBatchAfterBatchId(t,e){const n=e+1,s=IDBKeyRange.lowerBound([this.userId,n]);let i=null;return we(t).X({index:cn,range:s},(o,u,c)=>{u.userId===this.userId&&(U(u.batchId>=n,47524,{er:n}),i=on(this.serializer,u)),c.done()}).next(()=>i)}getHighestUnacknowledgedBatchId(t){const e=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=xe;return we(t).X({index:cn,range:e,reverse:!0},(s,i,o)=>{n=i.batchId,o.done()}).next(()=>n)}getAllMutationBatches(t){const e=IDBKeyRange.bound([this.userId,xe],[this.userId,Number.POSITIVE_INFINITY]);return we(t).j(cn,e).next(n=>n.map(s=>on(this.serializer,s)))}getAllMutationBatchesAffectingDocumentKey(t,e){const n=li(this.userId,e.path),s=IDBKeyRange.lowerBound(n),i=[];return Un(t).X({range:s},(o,u,c)=>{const[h,f,m]=o,g=ee(f);if(h===this.userId&&e.path.isEqual(g))return we(t).get(m).next(w=>{if(!w)throw M(61480,{tr:o,batchId:m});U(w.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:w.userId,batchId:m}),i.push(on(this.serializer,w))});c.done()}).next(()=>i)}getAllMutationBatchesAffectingDocumentKeys(t,e){let n=new rt(z);const s=[];return e.forEach(i=>{const o=li(this.userId,i.path),u=IDBKeyRange.lowerBound(o),c=Un(t).X({range:u},(h,f,m)=>{const[g,w,V]=h,D=ee(w);g===this.userId&&i.path.isEqual(D)?n=n.add(V):m.done()});s.push(c)}),A.waitFor(s).next(()=>this.nr(t,n))}getAllMutationBatchesAffectingQuery(t,e){const n=e.path,s=n.length+1,i=li(this.userId,n),o=IDBKeyRange.lowerBound(i);let u=new rt(z);return Un(t).X({range:o},(c,h,f)=>{const[m,g,w]=c,V=ee(g);m===this.userId&&n.isPrefixOf(V)?V.length===s&&(u=u.add(w)):f.done()}).next(()=>this.nr(t,u))}nr(t,e){const n=[],s=[];return e.forEach(i=>{s.push(we(t).get(i).next(o=>{if(o===null)throw M(35274,{batchId:i});U(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:i}),n.push(on(this.serializer,o))}))}),A.waitFor(s).next(()=>n)}removeMutationBatch(t,e){return gf(t.ce,this.userId,e).next(n=>(t.addOnCommittedListener(()=>{this.rr(e.batchId)}),A.forEach(n,s=>this.referenceDelegate.markPotentiallyOrphaned(t,s))))}rr(t){delete this.Zn[t]}performConsistencyCheck(t){return this.checkEmpty(t).next(e=>{if(!e)return A.resolve();const n=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),s=[];return Un(t).X({range:n},(i,o,u)=>{if(i[0]===this.userId){const c=ee(i[1]);s.push(c)}else u.done()}).next(()=>{U(s.length===0,56720,{ir:s.map(i=>i.canonicalString())})})})}containsKey(t,e){return _f(t,this.userId,e)}sr(t){return yf(t).get(this.userId).next(e=>e||{userId:this.userId,lastAcknowledgedBatchId:xe,lastStreamToken:""})}}function _f(r,t,e){const n=li(t,e.path),s=n[1],i=IDBKeyRange.lowerBound(n);let o=!1;return Un(r).X({range:i,Z:!0},(u,c,h)=>{const[f,m,g]=u;f===t&&m===s&&(o=!0),h.done()}).next(()=>o)}function we(r){return Tt(r,Xt)}function Un(r){return Tt(r,Wn)}function yf(r){return Tt(r,ls)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class In{constructor(t){this._r=t}next(){return this._r+=2,this._r}static ar(){return new In(0)}static ur(){return new In(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oy{constructor(t,e){this.referenceDelegate=t,this.serializer=e}allocateTargetId(t){return this.cr(t).next(e=>{const n=new In(e.highestTargetId);return e.highestTargetId=n.next(),this.lr(t,e).next(()=>e.highestTargetId)})}getLastRemoteSnapshotVersion(t){return this.cr(t).next(e=>j.fromTimestamp(new Z(e.lastRemoteSnapshotVersion.seconds,e.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(t){return this.cr(t).next(e=>e.highestListenSequenceNumber)}setTargetsMetadata(t,e,n){return this.cr(t).next(s=>(s.highestListenSequenceNumber=e,n&&(s.lastRemoteSnapshotVersion=n.toTimestamp()),e>s.highestListenSequenceNumber&&(s.highestListenSequenceNumber=e),this.lr(t,s)))}addTargetData(t,e){return this.hr(t,e).next(()=>this.cr(t).next(n=>(n.targetCount+=1,this.Pr(e,n),this.lr(t,n))))}updateTargetData(t,e){return this.hr(t,e)}removeTargetData(t,e){return this.removeMatchingKeysForTargetId(t,e.targetId).next(()=>Fn(t).delete(e.targetId)).next(()=>this.cr(t)).next(n=>(U(n.targetCount>0,8065),n.targetCount-=1,this.lr(t,n)))}removeTargets(t,e,n){let s=0;const i=[];return Fn(t).X((o,u)=>{const c=Hr(u);c.sequenceNumber<=e&&n.get(c.targetId)===null&&(s++,i.push(this.removeTargetData(t,c)))}).next(()=>A.waitFor(i)).next(()=>s)}forEachTarget(t,e){return Fn(t).X((n,s)=>{const i=Hr(s);e(i)})}cr(t){return Kl(t).get(bi).next(e=>(U(e!==null,2888),e))}lr(t,e){return Kl(t).put(bi,e)}hr(t,e){return Fn(t).put(df(this.serializer,e))}Pr(t,e){let n=!1;return t.targetId>e.highestTargetId&&(e.highestTargetId=t.targetId,n=!0),t.sequenceNumber>e.highestListenSequenceNumber&&(e.highestListenSequenceNumber=t.sequenceNumber,n=!0),n}getTargetCount(t){return this.cr(t).next(e=>e.targetCount)}getTargetData(t,e){const n=mn(e),s=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let i=null;return Fn(t).X({range:s,index:id},(o,u,c)=>{const h=Hr(u);As(e,h.target)&&(i=h,c.done())}).next(()=>i)}addMatchingKeys(t,e,n){const s=[],i=Re(t);return e.forEach(o=>{const u=kt(o.path);s.push(i.put({targetId:n,path:u})),s.push(this.referenceDelegate.addReference(t,n,o))}),A.waitFor(s)}removeMatchingKeys(t,e,n){const s=Re(t);return A.forEach(e,i=>{const o=kt(i.path);return A.waitFor([s.delete([n,o]),this.referenceDelegate.removeReference(t,n,i)])})}removeMatchingKeysForTargetId(t,e){const n=Re(t),s=IDBKeyRange.bound([e],[e+1],!1,!0);return n.delete(s)}getMatchingKeysForTargetId(t,e){const n=IDBKeyRange.bound([e],[e+1],!1,!0),s=Re(t);let i=$();return s.X({range:n,Z:!0},(o,u,c)=>{const h=ee(o[1]),f=new k(h);i=i.add(f)}).next(()=>i)}containsKey(t,e){const n=kt(e.path),s=IDBKeyRange.bound([n],[Qh(n)],!1,!0);let i=0;return Re(t).X({index:La,Z:!0,range:s},([o,u],c,h)=>{o!==0&&(i++,h.done())}).next(()=>i>0)}Et(t,e){return Fn(t).get(e).next(n=>n?Hr(n):null)}}function Fn(r){return Tt(r,Hn)}function Kl(r){return Tt(r,hn)}function Re(r){return Tt(r,Xn)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ql="LruGarbageCollector",If=1048576;function Wl([r,t],[e,n]){const s=z(r,e);return s===0?z(t,n):s}class Fy{constructor(t){this.Tr=t,this.buffer=new rt(Wl),this.Ir=0}dr(){return++this.Ir}Er(t){const e=[t,this.dr()];if(this.buffer.size<this.Tr)this.buffer=this.buffer.add(e);else{const n=this.buffer.last();Wl(e,n)<0&&(this.buffer=this.buffer.delete(n).add(e))}}get maxValue(){return this.buffer.last()[0]}}class Ef{constructor(t,e,n){this.garbageCollector=t,this.asyncQueue=e,this.localStore=n,this.Ar=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Rr(6e4)}stop(){this.Ar&&(this.Ar.cancel(),this.Ar=null)}get started(){return this.Ar!==null}Rr(t){N(Ql,`Garbage collection scheduled in ${t}ms`),this.Ar=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",t,async()=>{this.Ar=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(e){ze(e)?N(Ql,"Ignoring IndexedDB error during garbage collection: ",e):await je(e)}await this.Rr(3e5)})}}class My{constructor(t,e){this.Vr=t,this.params=e}calculateTargetCount(t,e){return this.Vr.mr(t).next(n=>Math.floor(e/100*n))}nthSequenceNumber(t,e){if(e===0)return A.resolve(Ut.ue);const n=new Fy(e);return this.Vr.forEachTarget(t,s=>n.Er(s.sequenceNumber)).next(()=>this.Vr.gr(t,s=>n.Er(s))).next(()=>n.maxValue)}removeTargets(t,e,n){return this.Vr.removeTargets(t,e,n)}removeOrphanedDocuments(t,e){return this.Vr.removeOrphanedDocuments(t,e)}collect(t,e){return this.params.cacheSizeCollectionThreshold===-1?(N("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(Gl)):this.getCacheSize(t).next(n=>n<this.params.cacheSizeCollectionThreshold?(N("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Gl):this.pr(t,e))}getCacheSize(t){return this.Vr.getCacheSize(t)}pr(t,e){let n,s,i,o,u,c,h;const f=Date.now();return this.calculateTargetCount(t,this.params.percentileToCollect).next(m=>(m>this.params.maximumSequenceNumbersToCollect?(N("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${m}`),s=this.params.maximumSequenceNumbersToCollect):s=m,o=Date.now(),this.nthSequenceNumber(t,s))).next(m=>(n=m,u=Date.now(),this.removeTargets(t,n,e))).next(m=>(i=m,c=Date.now(),this.removeOrphanedDocuments(t,n))).next(m=>(h=Date.now(),Mn()<=J.DEBUG&&N("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-f}ms
	Determined least recently used ${s} in `+(u-o)+`ms
	Removed ${i} targets in `+(c-u)+`ms
	Removed ${m} documents in `+(h-c)+`ms
Total Duration: ${h-f}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:m})))}}function Tf(r,t){return new My(r,t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ly{constructor(t,e){this.db=t,this.garbageCollector=Tf(this,e)}mr(t){const e=this.yr(t);return this.db.getTargetCache().getTargetCount(t).next(n=>e.next(s=>n+s))}yr(t){let e=0;return this.gr(t,n=>{e++}).next(()=>e)}forEachTarget(t,e){return this.db.getTargetCache().forEachTarget(t,e)}gr(t,e){return this.wr(t,(n,s)=>e(s))}addReference(t,e,n){return ii(t,n)}removeReference(t,e,n){return ii(t,n)}removeTargets(t,e,n){return this.db.getTargetCache().removeTargets(t,e,n)}markPotentiallyOrphaned(t,e){return ii(t,e)}Sr(t,e){return function(s,i){let o=!1;return yf(s).ee(u=>_f(s,u,i).next(c=>(c&&(o=!0),A.resolve(!c)))).next(()=>o)}(t,e)}removeOrphanedDocuments(t,e){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),s=[];let i=0;return this.wr(t,(o,u)=>{if(u<=e){const c=this.Sr(t,o).next(h=>{if(!h)return i++,n.getEntry(t,o).next(()=>(n.removeEntry(o,j.min()),Re(t).delete(function(m){return[0,kt(m.path)]}(o))))});s.push(c)}}).next(()=>A.waitFor(s)).next(()=>n.apply(t)).next(()=>i)}removeTarget(t,e){const n=e.withSequenceNumber(t.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(t,n)}updateLimboDocument(t,e){return ii(t,e)}wr(t,e){const n=Re(t);let s,i=Ut.ue;return n.X({index:La},([o,u],{path:c,sequenceNumber:h})=>{o===0?(i!==Ut.ue&&e(new k(ee(s)),i),i=h,s=c):i=Ut.ue}).next(()=>{i!==Ut.ue&&e(new k(ee(s)),i)})}getCacheSize(t){return this.db.getRemoteDocumentCache().getSize(t)}}function ii(r,t){return Re(r).put(function(n,s){return{targetId:0,path:kt(n.path),sequenceNumber:s}}(t,r.currentSequenceNumber))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vf{constructor(){this.changes=new pe(t=>t.toString(),(t,e)=>t.isEqual(e)),this.changesApplied=!1}addEntry(t){this.assertNotApplied(),this.changes.set(t.key,t)}removeEntry(t,e){this.assertNotApplied(),this.changes.set(t,ut.newInvalidDocument(t).setReadTime(e))}getEntry(t,e){this.assertNotApplied();const n=this.changes.get(e);return n!==void 0?A.resolve(n):this.getFromCache(t,e)}getEntries(t,e){return this.getAllFromCache(t,e)}apply(t){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(t)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class By{constructor(t){this.serializer=t}setIndexManager(t){this.indexManager=t}addEntry(t,e,n){return tn(t).put(n)}removeEntry(t,e,n){return tn(t).delete(function(i,o){const u=i.path.toArray();return[u.slice(0,u.length-2),u[u.length-2],Ci(o),u[u.length-1]]}(e,n))}updateMetadata(t,e){return this.getMetadata(t).next(n=>(n.byteSize+=e,this.br(t,n)))}getEntry(t,e){let n=ut.newInvalidDocument(e);return tn(t).X({index:hi,range:IDBKeyRange.only($r(e))},(s,i)=>{n=this.Dr(e,i)}).next(()=>n)}vr(t,e){let n={size:0,document:ut.newInvalidDocument(e)};return tn(t).X({index:hi,range:IDBKeyRange.only($r(e))},(s,i)=>{n={document:this.Dr(e,i),size:xi(i)}}).next(()=>n)}getEntries(t,e){let n=jt();return this.Cr(t,e,(s,i)=>{const o=this.Dr(s,i);n=n.insert(s,o)}).next(()=>n)}Fr(t,e){let n=jt(),s=new ot(k.comparator);return this.Cr(t,e,(i,o)=>{const u=this.Dr(i,o);n=n.insert(i,u),s=s.insert(i,xi(o))}).next(()=>({documents:n,Mr:s}))}Cr(t,e,n){if(e.isEmpty())return A.resolve();let s=new rt(Jl);e.forEach(c=>s=s.add(c));const i=IDBKeyRange.bound($r(s.first()),$r(s.last())),o=s.getIterator();let u=o.getNext();return tn(t).X({index:hi,range:i},(c,h,f)=>{const m=k.fromSegments([...h.prefixPath,h.collectionGroup,h.documentId]);for(;u&&Jl(u,m)<0;)n(u,null),u=o.getNext();u&&u.isEqual(m)&&(n(u,h),u=o.hasNext()?o.getNext():null),u?f.G($r(u)):f.done()}).next(()=>{for(;u;)n(u,null),u=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(t,e,n,s,i){const o=e.path,u=[o.popLast().toArray(),o.lastSegment(),Ci(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],c=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return tn(t).j(IDBKeyRange.bound(u,c,!0)).next(h=>{i?.incrementDocumentReadCount(h.length);let f=jt();for(const m of h){const g=this.Dr(k.fromSegments(m.prefixPath.concat(m.collectionGroup,m.documentId)),m);g.isFoundDocument()&&(Rs(e,g)||s.has(g.key))&&(f=f.insert(g.key,g))}return f})}getAllFromCollectionGroup(t,e,n,s){let i=jt();const o=Xl(e,n),u=Xl(e,Qt.max());return tn(t).X({index:sd,range:IDBKeyRange.bound(o,u,!0)},(c,h,f)=>{const m=this.Dr(k.fromSegments(h.prefixPath.concat(h.collectionGroup,h.documentId)),h);i=i.insert(m.key,m),i.size===s&&f.done()}).next(()=>i)}newChangeBuffer(t){return new Uy(this,!!t&&t.trackRemovals)}getSize(t){return this.getMetadata(t).next(e=>e.byteSize)}getMetadata(t){return Hl(t).get(aa).next(e=>(U(!!e,20021),e))}br(t,e){return Hl(t).put(aa,e)}Dr(t,e){if(e){const n=by(this.serializer,e);if(!(n.isNoDocument()&&n.version.isEqual(j.min())))return n}return ut.newInvalidDocument(t)}}function wf(r){return new By(r)}class Uy extends vf{constructor(t,e){super(),this.Or=t,this.trackRemovals=e,this.Nr=new pe(n=>n.toString(),(n,s)=>n.isEqual(s))}applyChanges(t){const e=[];let n=0,s=new rt((i,o)=>z(i.canonicalString(),o.canonicalString()));return this.changes.forEach((i,o)=>{const u=this.Nr.get(i);if(e.push(this.Or.removeEntry(t,i,u.readTime)),o.isValidDocument()){const c=xl(this.Or.serializer,o);s=s.add(i.path.popLast());const h=xi(c);n+=h-u.size,e.push(this.Or.addEntry(t,i,c))}else if(n-=u.size,this.trackRemovals){const c=xl(this.Or.serializer,o.convertToNoDocument(j.min()));e.push(this.Or.addEntry(t,i,c))}}),s.forEach(i=>{e.push(this.Or.indexManager.addToCollectionParentIndex(t,i))}),e.push(this.Or.updateMetadata(t,n)),A.waitFor(e)}getFromCache(t,e){return this.Or.vr(t,e).next(n=>(this.Nr.set(e,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(t,e){return this.Or.Fr(t,e).next(({documents:n,Mr:s})=>(s.forEach((i,o)=>{this.Nr.set(i,{size:o,readTime:n.get(i).readTime})}),n))}}function Hl(r){return Tt(r,hs)}function tn(r){return Tt(r,Ai)}function $r(r){const t=r.path.toArray();return[t.slice(0,t.length-2),t[t.length-2],t[t.length-1]]}function Xl(r,t){const e=t.documentKey.path.toArray();return[r,Ci(t.readTime),e.slice(0,e.length-2),e.length>0?e[e.length-1]:""]}function Jl(r,t){const e=r.path.toArray(),n=t.path.toArray();let s=0;for(let i=0;i<e.length-2&&i<n.length-2;++i)if(s=z(e[i],n[i]),s)return s;return s=z(e.length,n.length),s||(s=z(e[e.length-2],n[n.length-2]),s||z(e[e.length-1],n[n.length-1]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qy{constructor(t,e){this.overlayedDocument=t,this.mutatedFields=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Af{constructor(t,e,n,s){this.remoteDocumentCache=t,this.mutationQueue=e,this.documentOverlayCache=n,this.indexManager=s}getDocument(t,e){let n=null;return this.documentOverlayCache.getOverlay(t,e).next(s=>(n=s,this.remoteDocumentCache.getEntry(t,e))).next(s=>(n!==null&&ss(n.mutation,s,qt.empty(),Z.now()),s))}getDocuments(t,e){return this.remoteDocumentCache.getEntries(t,e).next(n=>this.getLocalViewOfDocuments(t,n,$()).next(()=>n))}getLocalViewOfDocuments(t,e,n=$()){const s=ne();return this.populateOverlays(t,s,e).next(()=>this.computeViews(t,e,s,n).next(i=>{let o=Qr();return i.forEach((u,c)=>{o=o.insert(u,c.overlayedDocument)}),o}))}getOverlayedDocuments(t,e){const n=ne();return this.populateOverlays(t,n,e).next(()=>this.computeViews(t,e,n,$()))}populateOverlays(t,e,n){const s=[];return n.forEach(i=>{e.has(i)||s.push(i)}),this.documentOverlayCache.getOverlays(t,s).next(i=>{i.forEach((o,u)=>{e.set(o,u)})})}computeViews(t,e,n,s){let i=jt();const o=rs(),u=function(){return rs()}();return e.forEach((c,h)=>{const f=n.get(h.key);s.has(h.key)&&(f===void 0||f.mutation instanceof ge)?i=i.insert(h.key,h):f!==void 0?(o.set(h.key,f.mutation.getFieldMask()),ss(f.mutation,h,f.mutation.getFieldMask(),Z.now())):o.set(h.key,qt.empty())}),this.recalculateAndSaveOverlays(t,i).next(c=>(c.forEach((h,f)=>o.set(h,f)),e.forEach((h,f)=>{var m;return u.set(h,new qy(f,(m=o.get(h))!==null&&m!==void 0?m:null))}),u))}recalculateAndSaveOverlays(t,e){const n=rs();let s=new ot((o,u)=>o-u),i=$();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(t,e).next(o=>{for(const u of o)u.keys().forEach(c=>{const h=e.get(c);if(h===null)return;let f=n.get(c)||qt.empty();f=u.applyToLocalView(h,f),n.set(c,f);const m=(s.get(u.batchId)||$()).add(c);s=s.insert(u.batchId,m)})}).next(()=>{const o=[],u=s.getReverseIterator();for(;u.hasNext();){const c=u.getNext(),h=c.key,f=c.value,m=Bd();f.forEach(g=>{if(!i.has(g)){const w=Kd(e.get(g),n.get(g));w!==null&&m.set(g,w),i=i.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(t,h,m))}return A.waitFor(o)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(t,e){return this.remoteDocumentCache.getEntries(t,e).next(n=>this.recalculateAndSaveOverlays(t,n))}getDocumentsMatchingQuery(t,e,n,s){return function(o){return k.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0}(e)?this.getDocumentsMatchingDocumentQuery(t,e.path):Ga(e)?this.getDocumentsMatchingCollectionGroupQuery(t,e,n,s):this.getDocumentsMatchingCollectionQuery(t,e,n,s)}getNextDocuments(t,e,n,s){return this.remoteDocumentCache.getAllFromCollectionGroup(t,e,n,s).next(i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(t,e,n.largestBatchId,s-i.size):A.resolve(ne());let u=Gn,c=i;return o.next(h=>A.forEach(h,(f,m)=>(u<m.largestBatchId&&(u=m.largestBatchId),i.get(f)?A.resolve():this.remoteDocumentCache.getEntry(t,f).next(g=>{c=c.insert(f,g)}))).next(()=>this.populateOverlays(t,h,i)).next(()=>this.computeViews(t,c,h,$())).next(f=>({batchId:u,changes:Ld(f)})))})}getDocumentsMatchingDocumentQuery(t,e){return this.getDocument(t,new k(e)).next(n=>{let s=Qr();return n.isFoundDocument()&&(s=s.insert(n.key,n)),s})}getDocumentsMatchingCollectionGroupQuery(t,e,n,s){const i=e.collectionGroup;let o=Qr();return this.indexManager.getCollectionParents(t,i).next(u=>A.forEach(u,c=>{const h=function(m,g){return new me(g,null,m.explicitOrderBy.slice(),m.filters.slice(),m.limit,m.limitType,m.startAt,m.endAt)}(e,c.child(i));return this.getDocumentsMatchingCollectionQuery(t,h,n,s).next(f=>{f.forEach((m,g)=>{o=o.insert(m,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(t,e,n,s){let i;return this.documentOverlayCache.getOverlaysForCollection(t,e.path,n.largestBatchId).next(o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(t,e,n,i,s))).next(o=>{i.forEach((c,h)=>{const f=h.getKey();o.get(f)===null&&(o=o.insert(f,ut.newInvalidDocument(f)))});let u=Qr();return o.forEach((c,h)=>{const f=i.get(c);f!==void 0&&ss(f.mutation,h,qt.empty(),Z.now()),Rs(e,h)&&(u=u.insert(c,h))}),u})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jy{constructor(t){this.serializer=t,this.Br=new Map,this.Lr=new Map}getBundleMetadata(t,e){return A.resolve(this.Br.get(e))}saveBundleMetadata(t,e){return this.Br.set(e.id,function(s){return{id:s.id,version:s.version,createTime:gt(s.createTime)}}(e)),A.resolve()}getNamedQuery(t,e){return A.resolve(this.Lr.get(e))}saveNamedQuery(t,e){return this.Lr.set(e.name,function(s){return{name:s.name,query:to(s.bundledQuery),readTime:gt(s.readTime)}}(e)),A.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zy{constructor(){this.overlays=new ot(k.comparator),this.kr=new Map}getOverlay(t,e){return A.resolve(this.overlays.get(e))}getOverlays(t,e){const n=ne();return A.forEach(e,s=>this.getOverlay(t,s).next(i=>{i!==null&&n.set(s,i)})).next(()=>n)}saveOverlays(t,e,n){return n.forEach((s,i)=>{this.wt(t,e,i)}),A.resolve()}removeOverlaysForBatchId(t,e,n){const s=this.kr.get(n);return s!==void 0&&(s.forEach(i=>this.overlays=this.overlays.remove(i)),this.kr.delete(n)),A.resolve()}getOverlaysForCollection(t,e,n){const s=ne(),i=e.length+1,o=new k(e.child("")),u=this.overlays.getIteratorFrom(o);for(;u.hasNext();){const c=u.getNext().value,h=c.getKey();if(!e.isPrefixOf(h.path))break;h.path.length===i&&c.largestBatchId>n&&s.set(c.getKey(),c)}return A.resolve(s)}getOverlaysForCollectionGroup(t,e,n,s){let i=new ot((h,f)=>h-f);const o=this.overlays.getIterator();for(;o.hasNext();){const h=o.getNext().value;if(h.getKey().getCollectionGroup()===e&&h.largestBatchId>n){let f=i.get(h.largestBatchId);f===null&&(f=ne(),i=i.insert(h.largestBatchId,f)),f.set(h.getKey(),h)}}const u=ne(),c=i.getIterator();for(;c.hasNext()&&(c.getNext().value.forEach((h,f)=>u.set(h,f)),!(u.size()>=s)););return A.resolve(u)}wt(t,e,n){const s=this.overlays.get(n.key);if(s!==null){const o=this.kr.get(s.largestBatchId).delete(n.key);this.kr.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new Ja(e,n));let i=this.kr.get(e);i===void 0&&(i=$(),this.kr.set(e,i)),this.kr.set(e,i.add(n.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $y{constructor(){this.sessionToken=ft.EMPTY_BYTE_STRING}getSessionToken(t){return A.resolve(this.sessionToken)}setSessionToken(t,e){return this.sessionToken=e,A.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nu{constructor(){this.qr=new rt(vt.Qr),this.$r=new rt(vt.Ur)}isEmpty(){return this.qr.isEmpty()}addReference(t,e){const n=new vt(t,e);this.qr=this.qr.add(n),this.$r=this.$r.add(n)}Kr(t,e){t.forEach(n=>this.addReference(n,e))}removeReference(t,e){this.Wr(new vt(t,e))}Gr(t,e){t.forEach(n=>this.removeReference(n,e))}zr(t){const e=new k(new Q([])),n=new vt(e,t),s=new vt(e,t+1),i=[];return this.$r.forEachInRange([n,s],o=>{this.Wr(o),i.push(o.key)}),i}jr(){this.qr.forEach(t=>this.Wr(t))}Wr(t){this.qr=this.qr.delete(t),this.$r=this.$r.delete(t)}Jr(t){const e=new k(new Q([])),n=new vt(e,t),s=new vt(e,t+1);let i=$();return this.$r.forEachInRange([n,s],o=>{i=i.add(o.key)}),i}containsKey(t){const e=new vt(t,0),n=this.qr.firstAfterOrEqual(e);return n!==null&&t.isEqual(n.key)}}class vt{constructor(t,e){this.key=t,this.Hr=e}static Qr(t,e){return k.comparator(t.key,e.key)||z(t.Hr,e.Hr)}static Ur(t,e){return z(t.Hr,e.Hr)||k.comparator(t.key,e.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gy{constructor(t,e){this.indexManager=t,this.referenceDelegate=e,this.mutationQueue=[],this.er=1,this.Yr=new rt(vt.Qr)}checkEmpty(t){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(t,e,n,s){const i=this.er;this.er++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Ha(i,e,n,s);this.mutationQueue.push(o);for(const u of s)this.Yr=this.Yr.add(new vt(u.key,i)),this.indexManager.addToCollectionParentIndex(t,u.key.path.popLast());return A.resolve(o)}lookupMutationBatch(t,e){return A.resolve(this.Zr(e))}getNextMutationBatchAfterBatchId(t,e){const n=e+1,s=this.Xr(n),i=s<0?0:s;return A.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?xe:this.er-1)}getAllMutationBatches(t){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(t,e){const n=new vt(e,0),s=new vt(e,Number.POSITIVE_INFINITY),i=[];return this.Yr.forEachInRange([n,s],o=>{const u=this.Zr(o.Hr);i.push(u)}),A.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(t,e){let n=new rt(z);return e.forEach(s=>{const i=new vt(s,0),o=new vt(s,Number.POSITIVE_INFINITY);this.Yr.forEachInRange([i,o],u=>{n=n.add(u.Hr)})}),A.resolve(this.ei(n))}getAllMutationBatchesAffectingQuery(t,e){const n=e.path,s=n.length+1;let i=n;k.isDocumentKey(i)||(i=i.child(""));const o=new vt(new k(i),0);let u=new rt(z);return this.Yr.forEachWhile(c=>{const h=c.key.path;return!!n.isPrefixOf(h)&&(h.length===s&&(u=u.add(c.Hr)),!0)},o),A.resolve(this.ei(u))}ei(t){const e=[];return t.forEach(n=>{const s=this.Zr(n);s!==null&&e.push(s)}),e}removeMutationBatch(t,e){U(this.ti(e.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.Yr;return A.forEach(e.mutations,s=>{const i=new vt(s.key,e.batchId);return n=n.delete(i),this.referenceDelegate.markPotentiallyOrphaned(t,s.key)}).next(()=>{this.Yr=n})}rr(t){}containsKey(t,e){const n=new vt(e,0),s=this.Yr.firstAfterOrEqual(n);return A.resolve(e.isEqual(s&&s.key))}performConsistencyCheck(t){return this.mutationQueue.length,A.resolve()}ti(t,e){return this.Xr(t)}Xr(t){return this.mutationQueue.length===0?0:t-this.mutationQueue[0].batchId}Zr(t){const e=this.Xr(t);return e<0||e>=this.mutationQueue.length?null:this.mutationQueue[e]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ky{constructor(t){this.ni=t,this.docs=function(){return new ot(k.comparator)}(),this.size=0}setIndexManager(t){this.indexManager=t}addEntry(t,e){const n=e.key,s=this.docs.get(n),i=s?s.size:0,o=this.ni(e);return this.docs=this.docs.insert(n,{document:e.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(t,n.path.popLast())}removeEntry(t){const e=this.docs.get(t);e&&(this.docs=this.docs.remove(t),this.size-=e.size)}getEntry(t,e){const n=this.docs.get(e);return A.resolve(n?n.document.mutableCopy():ut.newInvalidDocument(e))}getEntries(t,e){let n=jt();return e.forEach(s=>{const i=this.docs.get(s);n=n.insert(s,i?i.document.mutableCopy():ut.newInvalidDocument(s))}),A.resolve(n)}getDocumentsMatchingQuery(t,e,n,s){let i=jt();const o=e.path,u=new k(o.child("__id-9223372036854775808__")),c=this.docs.getIteratorFrom(u);for(;c.hasNext();){const{key:h,value:{document:f}}=c.getNext();if(!o.isPrefixOf(h.path))break;h.path.length>o.length+1||Fa(Yh(f),n)<=0||(s.has(f.key)||Rs(e,f))&&(i=i.insert(f.key,f.mutableCopy()))}return A.resolve(i)}getAllFromCollectionGroup(t,e,n,s){M(9500)}ri(t,e){return A.forEach(this.docs,n=>e(n))}newChangeBuffer(t){return new Qy(this)}getSize(t){return A.resolve(this.size)}}class Qy extends vf{constructor(t){super(),this.Or=t}applyChanges(t){const e=[];return this.changes.forEach((n,s)=>{s.isValidDocument()?e.push(this.Or.addEntry(t,s)):this.Or.removeEntry(n)}),A.waitFor(e)}getFromCache(t,e){return this.Or.getEntry(t,e)}getAllFromCache(t,e){return this.Or.getEntries(t,e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wy{constructor(t){this.persistence=t,this.ii=new pe(e=>mn(e),As),this.lastRemoteSnapshotVersion=j.min(),this.highestTargetId=0,this.si=0,this.oi=new nu,this.targetCount=0,this._i=In.ar()}forEachTarget(t,e){return this.ii.forEach((n,s)=>e(s)),A.resolve()}getLastRemoteSnapshotVersion(t){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(t){return A.resolve(this.si)}allocateTargetId(t){return this.highestTargetId=this._i.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(t,e,n){return n&&(this.lastRemoteSnapshotVersion=n),e>this.si&&(this.si=e),A.resolve()}hr(t){this.ii.set(t.target,t);const e=t.targetId;e>this.highestTargetId&&(this._i=new In(e),this.highestTargetId=e),t.sequenceNumber>this.si&&(this.si=t.sequenceNumber)}addTargetData(t,e){return this.hr(e),this.targetCount+=1,A.resolve()}updateTargetData(t,e){return this.hr(e),A.resolve()}removeTargetData(t,e){return this.ii.delete(e.target),this.oi.zr(e.targetId),this.targetCount-=1,A.resolve()}removeTargets(t,e,n){let s=0;const i=[];return this.ii.forEach((o,u)=>{u.sequenceNumber<=e&&n.get(u.targetId)===null&&(this.ii.delete(o),i.push(this.removeMatchingKeysForTargetId(t,u.targetId)),s++)}),A.waitFor(i).next(()=>s)}getTargetCount(t){return A.resolve(this.targetCount)}getTargetData(t,e){const n=this.ii.get(e)||null;return A.resolve(n)}addMatchingKeys(t,e,n){return this.oi.Kr(e,n),A.resolve()}removeMatchingKeys(t,e,n){this.oi.Gr(e,n);const s=this.persistence.referenceDelegate,i=[];return s&&e.forEach(o=>{i.push(s.markPotentiallyOrphaned(t,o))}),A.waitFor(i)}removeMatchingKeysForTargetId(t,e){return this.oi.zr(e),A.resolve()}getMatchingKeysForTargetId(t,e){const n=this.oi.Jr(e);return A.resolve(n)}containsKey(t,e){return A.resolve(this.oi.containsKey(e))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ru{constructor(t,e){this.ai={},this.overlays={},this.ui=new Ut(0),this.ci=!1,this.ci=!0,this.li=new $y,this.referenceDelegate=t(this),this.hi=new Wy(this),this.indexManager=new Ny,this.remoteDocumentCache=function(s){return new Ky(s)}(n=>this.referenceDelegate.Pi(n)),this.serializer=new hf(e),this.Ti=new jy(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ci=!1,Promise.resolve()}get started(){return this.ci}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(t){return this.indexManager}getDocumentOverlayCache(t){let e=this.overlays[t.toKey()];return e||(e=new zy,this.overlays[t.toKey()]=e),e}getMutationQueue(t,e){let n=this.ai[t.toKey()];return n||(n=new Gy(e,this.referenceDelegate),this.ai[t.toKey()]=n),n}getGlobalsCache(){return this.li}getTargetCache(){return this.hi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ti}runTransaction(t,e,n){N("MemoryPersistence","Starting transaction:",t);const s=new Hy(this.ui.next());return this.referenceDelegate.Ii(),n(s).next(i=>this.referenceDelegate.di(s).next(()=>i)).toPromise().then(i=>(s.raiseOnCommittedEvent(),i))}Ei(t,e){return A.or(Object.values(this.ai).map(n=>()=>n.containsKey(t,e)))}}class Hy extends td{constructor(t){super(),this.currentSequenceNumber=t}}class ro{constructor(t){this.persistence=t,this.Ai=new nu,this.Ri=null}static Vi(t){return new ro(t)}get mi(){if(this.Ri)return this.Ri;throw M(60996)}addReference(t,e,n){return this.Ai.addReference(n,e),this.mi.delete(n.toString()),A.resolve()}removeReference(t,e,n){return this.Ai.removeReference(n,e),this.mi.add(n.toString()),A.resolve()}markPotentiallyOrphaned(t,e){return this.mi.add(e.toString()),A.resolve()}removeTarget(t,e){this.Ai.zr(e.targetId).forEach(s=>this.mi.add(s.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(t,e.targetId).next(s=>{s.forEach(i=>this.mi.add(i.toString()))}).next(()=>n.removeTargetData(t,e))}Ii(){this.Ri=new Set}di(t){const e=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.mi,n=>{const s=k.fromPath(n);return this.fi(t,s).next(i=>{i||e.removeEntry(s,j.min())})}).next(()=>(this.Ri=null,e.apply(t)))}updateLimboDocument(t,e){return this.fi(t,e).next(n=>{n?this.mi.delete(e.toString()):this.mi.add(e.toString())})}Pi(t){return 0}fi(t,e){return A.or([()=>A.resolve(this.Ai.containsKey(e)),()=>this.persistence.getTargetCache().containsKey(t,e),()=>this.persistence.Ei(t,e)])}}class Ni{constructor(t,e){this.persistence=t,this.gi=new pe(n=>kt(n.path),(n,s)=>n.isEqual(s)),this.garbageCollector=Tf(this,e)}static Vi(t,e){return new Ni(t,e)}Ii(){}di(t){return A.resolve()}forEachTarget(t,e){return this.persistence.getTargetCache().forEachTarget(t,e)}mr(t){const e=this.yr(t);return this.persistence.getTargetCache().getTargetCount(t).next(n=>e.next(s=>n+s))}yr(t){let e=0;return this.gr(t,n=>{e++}).next(()=>e)}gr(t,e){return A.forEach(this.gi,(n,s)=>this.Sr(t,n,s).next(i=>i?A.resolve():e(s)))}removeTargets(t,e,n){return this.persistence.getTargetCache().removeTargets(t,e,n)}removeOrphanedDocuments(t,e){let n=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.ri(t,o=>this.Sr(t,o,e).next(u=>{u||(n++,i.removeEntry(o,j.min()))})).next(()=>i.apply(t)).next(()=>n)}markPotentiallyOrphaned(t,e){return this.gi.set(e,t.currentSequenceNumber),A.resolve()}removeTarget(t,e){const n=e.withSequenceNumber(t.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(t,n)}addReference(t,e,n){return this.gi.set(n,t.currentSequenceNumber),A.resolve()}removeReference(t,e,n){return this.gi.set(n,t.currentSequenceNumber),A.resolve()}updateLimboDocument(t,e){return this.gi.set(e,t.currentSequenceNumber),A.resolve()}Pi(t){let e=t.key.toString().length;return t.isFoundDocument()&&(e+=fi(t.data.value)),e}Sr(t,e,n){return A.or([()=>this.persistence.Ei(t,e),()=>this.persistence.getTargetCache().containsKey(t,e),()=>{const s=this.gi.get(e);return A.resolve(s!==void 0&&s>n)}])}getCacheSize(t){return this.persistence.getRemoteDocumentCache().getSize(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xy{constructor(t){this.serializer=t}q(t,e,n,s){const i=new zi("createOrUpgrade",e);n<1&&s>=1&&(function(c){c.createObjectStore(ws)}(t),function(c){c.createObjectStore(ls,{keyPath:m_}),c.createObjectStore(Xt,{keyPath:ul,autoIncrement:!0}).createIndex(cn,cl,{unique:!0}),c.createObjectStore(Wn)}(t),Yl(t),function(c){c.createObjectStore(rn)}(t));let o=A.resolve();return n<3&&s>=3&&(n!==0&&(function(c){c.deleteObjectStore(Xn),c.deleteObjectStore(Hn),c.deleteObjectStore(hn)}(t),Yl(t)),o=o.next(()=>function(c){const h=c.store(hn),f={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:j.min().toTimestamp(),targetCount:0};return h.put(bi,f)}(i))),n<4&&s>=4&&(n!==0&&(o=o.next(()=>function(c,h){return h.store(Xt).j().next(m=>{c.deleteObjectStore(Xt),c.createObjectStore(Xt,{keyPath:ul,autoIncrement:!0}).createIndex(cn,cl,{unique:!0});const g=h.store(Xt),w=m.map(V=>g.put(V));return A.waitFor(w)})}(t,i))),o=o.next(()=>{(function(c){c.createObjectStore(Jn,{keyPath:w_})})(t)})),n<5&&s>=5&&(o=o.next(()=>this.pi(i))),n<6&&s>=6&&(o=o.next(()=>(function(c){c.createObjectStore(hs)}(t),this.yi(i)))),n<7&&s>=7&&(o=o.next(()=>this.wi(i))),n<8&&s>=8&&(o=o.next(()=>this.Si(t,i))),n<9&&s>=9&&(o=o.next(()=>{(function(c){c.objectStoreNames.contains("remoteDocumentChanges")&&c.deleteObjectStore("remoteDocumentChanges")})(t)})),n<10&&s>=10&&(o=o.next(()=>this.bi(i))),n<11&&s>=11&&(o=o.next(()=>{(function(c){c.createObjectStore($i,{keyPath:A_})})(t),function(c){c.createObjectStore(Gi,{keyPath:b_})}(t)})),n<12&&s>=12&&(o=o.next(()=>{(function(c){const h=c.createObjectStore(Ki,{keyPath:x_});h.createIndex(ca,N_,{unique:!1}),h.createIndex(ud,k_,{unique:!1})})(t)})),n<13&&s>=13&&(o=o.next(()=>function(c){const h=c.createObjectStore(Ai,{keyPath:g_});h.createIndex(hi,__),h.createIndex(sd,y_)}(t)).next(()=>this.Di(t,i)).next(()=>t.deleteObjectStore(rn))),n<14&&s>=14&&(o=o.next(()=>this.Ci(t,i))),n<15&&s>=15&&(o=o.next(()=>function(c){c.createObjectStore(Ba,{keyPath:R_,autoIncrement:!0}).createIndex(ua,S_,{unique:!1}),c.createObjectStore(ts,{keyPath:P_}).createIndex(od,V_,{unique:!1}),c.createObjectStore(es,{keyPath:C_}).createIndex(ad,D_,{unique:!1})}(t))),n<16&&s>=16&&(o=o.next(()=>{e.objectStore(ts).clear()}).next(()=>{e.objectStore(es).clear()})),n<17&&s>=17&&(o=o.next(()=>{(function(c){c.createObjectStore(Ua,{keyPath:O_})})(t)})),n<18&&s>=18&&Ch()&&(o=o.next(()=>{e.objectStore(ts).clear()}).next(()=>{e.objectStore(es).clear()})),o}yi(t){let e=0;return t.store(rn).X((n,s)=>{e+=xi(s)}).next(()=>{const n={byteSize:e};return t.store(hs).put(aa,n)})}pi(t){const e=t.store(ls),n=t.store(Xt);return e.j().next(s=>A.forEach(s,i=>{const o=IDBKeyRange.bound([i.userId,xe],[i.userId,i.lastAcknowledgedBatchId]);return n.j(cn,o).next(u=>A.forEach(u,c=>{U(c.userId===i.userId,18650,"Cannot process batch from unexpected user",{batchId:c.batchId});const h=on(this.serializer,c);return gf(t,i.userId,h).next(()=>{})}))}))}wi(t){const e=t.store(Xn),n=t.store(rn);return t.store(hn).get(bi).next(s=>{const i=[];return n.X((o,u)=>{const c=new Q(o),h=function(m){return[0,kt(m)]}(c);i.push(e.get(h).next(f=>f?A.resolve():(m=>e.put({targetId:0,path:kt(m),sequenceNumber:s.highestListenSequenceNumber}))(c)))}).next(()=>A.waitFor(i))})}Si(t,e){t.createObjectStore(ds,{keyPath:v_});const n=e.store(ds),s=new eu,i=o=>{if(s.add(o)){const u=o.lastSegment(),c=o.popLast();return n.put({collectionId:u,parent:kt(c)})}};return e.store(rn).X({Z:!0},(o,u)=>{const c=new Q(o);return i(c.popLast())}).next(()=>e.store(Wn).X({Z:!0},([o,u,c],h)=>{const f=ee(u);return i(f.popLast())}))}bi(t){const e=t.store(Hn);return e.X((n,s)=>{const i=Hr(s),o=df(this.serializer,i);return e.put(o)})}Di(t,e){const n=e.store(rn),s=[];return n.X((i,o)=>{const u=e.store(Ai),c=function(m){return m.document?new k(Q.fromString(m.document.name).popFirst(5)):m.noDocument?k.fromSegments(m.noDocument.path):m.unknownDocument?k.fromSegments(m.unknownDocument.path):M(36783)}(o).path.toArray(),h={prefixPath:c.slice(0,c.length-2),collectionGroup:c[c.length-2],documentId:c[c.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};s.push(u.put(h))}).next(()=>A.waitFor(s))}Ci(t,e){const n=e.store(Xt),s=wf(this.serializer),i=new ru(ro.Vi,this.serializer.gt);return n.j().next(o=>{const u=new Map;return o.forEach(c=>{var h;let f=(h=u.get(c.userId))!==null&&h!==void 0?h:$();on(this.serializer,c).keys().forEach(m=>f=f.add(m)),u.set(c.userId,f)}),A.forEach(u,(c,h)=>{const f=new wt(h),m=eo.yt(this.serializer,f),g=i.getIndexManager(f),w=no.yt(f,this.serializer,g,i.referenceDelegate);return new Af(s,w,m,g).recalculateAndSaveOverlaysForDocumentKeys(new la(e,Ut.ue),c).next()})})}}function Yl(r){r.createObjectStore(Xn,{keyPath:E_}).createIndex(La,T_,{unique:!0}),r.createObjectStore(Hn,{keyPath:"targetId"}).createIndex(id,I_,{unique:!0}),r.createObjectStore(hn)}const Ae="IndexedDbPersistence",Go=18e5,Ko=5e3,Qo="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",bf="main";class su{constructor(t,e,n,s,i,o,u,c,h,f,m=18){if(this.allowTabSynchronization=t,this.persistenceKey=e,this.clientId=n,this.Fi=i,this.window=o,this.document=u,this.Mi=h,this.xi=f,this.Oi=m,this.ui=null,this.ci=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Ni=null,this.inForeground=!1,this.Bi=null,this.Li=null,this.ki=Number.NEGATIVE_INFINITY,this.qi=g=>Promise.resolve(),!su.C())throw new C(R.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new Ly(this,s),this.Qi=e+bf,this.serializer=new hf(c),this.$i=new re(this.Qi,this.Oi,new Xy(this.serializer)),this.li=new Sy,this.hi=new Oy(this.referenceDelegate,this.serializer),this.remoteDocumentCache=wf(this.serializer),this.Ti=new Ry,this.window&&this.window.localStorage?this.Ui=this.window.localStorage:(this.Ui=null,f===!1&&pt(Ae,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Ki().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new C(R.FAILED_PRECONDITION,Qo);return this.Wi(),this.Gi(),this.zi(),this.runTransaction("getHighestListenSequenceNumber","readonly",t=>this.hi.getHighestSequenceNumber(t))}).then(t=>{this.ui=new Ut(t,this.Mi)}).then(()=>{this.ci=!0}).catch(t=>(this.$i&&this.$i.close(),Promise.reject(t)))}ji(t){return this.qi=async e=>{if(this.started)return t(e)},t(this.isPrimary)}setDatabaseDeletedListener(t){this.$i.setDatabaseDeletedListener(t)}setNetworkEnabled(t){this.networkEnabled!==t&&(this.networkEnabled=t,this.Fi.enqueueAndForget(async()=>{this.started&&await this.Ki()}))}Ki(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",t=>oi(t).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.Ji(t).next(e=>{e||(this.isPrimary=!1,this.Fi.enqueueRetryable(()=>this.qi(!1)))})}).next(()=>this.Hi(t)).next(e=>this.isPrimary&&!e?this.Yi(t).next(()=>!1):!!e&&this.Zi(t).next(()=>!0))).catch(t=>{if(ze(t))return N(Ae,"Failed to extend owner lease: ",t),this.isPrimary;if(!this.allowTabSynchronization)throw t;return N(Ae,"Releasing owner lease after error during lease refresh",t),!1}).then(t=>{this.isPrimary!==t&&this.Fi.enqueueRetryable(()=>this.qi(t)),this.isPrimary=t})}Ji(t){return Gr(t).get(Dn).next(e=>A.resolve(this.Xi(e)))}es(t){return oi(t).delete(this.clientId)}async ts(){if(this.isPrimary&&!this.ns(this.ki,Go)){this.ki=Date.now();const t=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",e=>{const n=Tt(e,Jn);return n.j().next(s=>{const i=this.rs(s,Go),o=s.filter(u=>i.indexOf(u)===-1);return A.forEach(o,u=>n.delete(u.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ui)for(const e of t)this.Ui.removeItem(this.ss(e.clientId))}}zi(){this.Li=this.Fi.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.Ki().then(()=>this.ts()).then(()=>this.zi()))}Xi(t){return!!t&&t.ownerId===this.clientId}Hi(t){return this.xi?A.resolve(!0):Gr(t).get(Dn).next(e=>{if(e!==null&&this.ns(e.leaseTimestampMs,Ko)&&!this._s(e.ownerId)){if(this.Xi(e)&&this.networkEnabled)return!0;if(!this.Xi(e)){if(!e.allowTabSynchronization)throw new C(R.FAILED_PRECONDITION,Qo);return!1}}return!(!this.networkEnabled||!this.inForeground)||oi(t).j().next(n=>this.rs(n,Ko).find(s=>{if(this.clientId!==s.clientId){const i=!this.networkEnabled&&s.networkEnabled,o=!this.inForeground&&s.inForeground,u=this.networkEnabled===s.networkEnabled;if(i||o&&u)return!0}return!1})===void 0)}).next(e=>(this.isPrimary!==e&&N(Ae,`Client ${e?"is":"is not"} eligible for a primary lease.`),e))}async shutdown(){this.ci=!1,this.us(),this.Li&&(this.Li.cancel(),this.Li=null),this.cs(),this.ls(),await this.$i.runTransaction("shutdown","readwrite",[ws,Jn],t=>{const e=new la(t,Ut.ue);return this.Yi(e).next(()=>this.es(e))}),this.$i.close(),this.hs()}rs(t,e){return t.filter(n=>this.ns(n.updateTimeMs,e)&&!this._s(n.clientId))}Ps(){return this.runTransaction("getActiveClients","readonly",t=>oi(t).j().next(e=>this.rs(e,Go).map(n=>n.clientId)))}get started(){return this.ci}getGlobalsCache(){return this.li}getMutationQueue(t,e){return no.yt(t,this.serializer,e,this.referenceDelegate)}getTargetCache(){return this.hi}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(t){return new ky(t,this.serializer.gt.databaseId)}getDocumentOverlayCache(t){return eo.yt(this.serializer,t)}getBundleCache(){return this.Ti}runTransaction(t,e,n){N(Ae,"Starting transaction:",t);const s=e==="readonly"?"readonly":"readwrite",i=function(c){return c===18?L_:c===17?dd:c===16?M_:c===15?qa:c===14?hd:c===13?ld:c===12?F_:c===11?cd:void M(60245)}(this.Oi);let o;return this.$i.runTransaction(t,s,i,u=>(o=new la(u,this.ui?this.ui.next():Ut.ue),e==="readwrite-primary"?this.Ji(o).next(c=>!!c||this.Hi(o)).next(c=>{if(!c)throw pt(`Failed to obtain primary lease for action '${t}'.`),this.isPrimary=!1,this.Fi.enqueueRetryable(()=>this.qi(!1)),new C(R.FAILED_PRECONDITION,Zh);return n(o)}).next(c=>this.Zi(o).next(()=>c)):this.Ts(o).next(()=>n(o)))).then(u=>(o.raiseOnCommittedEvent(),u))}Ts(t){return Gr(t).get(Dn).next(e=>{if(e!==null&&this.ns(e.leaseTimestampMs,Ko)&&!this._s(e.ownerId)&&!this.Xi(e)&&!(this.xi||this.allowTabSynchronization&&e.allowTabSynchronization))throw new C(R.FAILED_PRECONDITION,Qo)})}Zi(t){const e={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Gr(t).put(Dn,e)}static C(){return re.C()}Yi(t){const e=Gr(t);return e.get(Dn).next(n=>this.Xi(n)?(N(Ae,"Releasing primary lease."),e.delete(Dn)):A.resolve())}ns(t,e){const n=Date.now();return!(t<n-e)&&(!(t>n)||(pt(`Detected an update time that is in the future: ${t} > ${n}`),!1))}Wi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Bi=()=>{this.Fi.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.Ki()))},this.document.addEventListener("visibilitychange",this.Bi),this.inForeground=this.document.visibilityState==="visible")}cs(){this.Bi&&(this.document.removeEventListener("visibilitychange",this.Bi),this.Bi=null)}Gi(){var t;typeof((t=this.window)===null||t===void 0?void 0:t.addEventListener)=="function"&&(this.Ni=()=>{this.us();const e=/(?:Version|Mobile)\/1[456]/;Vh()&&(navigator.appVersion.match(e)||navigator.userAgent.match(e))&&this.Fi.enterRestrictedMode(!0),this.Fi.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Ni))}ls(){this.Ni&&(this.window.removeEventListener("pagehide",this.Ni),this.Ni=null)}_s(t){var e;try{const n=((e=this.Ui)===null||e===void 0?void 0:e.getItem(this.ss(t)))!==null;return N(Ae,`Client '${t}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return pt(Ae,"Failed to get zombied client id.",n),!1}}us(){if(this.Ui)try{this.Ui.setItem(this.ss(this.clientId),String(Date.now()))}catch(t){pt("Failed to set zombie client id.",t)}}hs(){if(this.Ui)try{this.Ui.removeItem(this.ss(this.clientId))}catch{}}ss(t){return`firestore_zombie_${this.persistenceKey}_${t}`}}function Gr(r){return Tt(r,ws)}function oi(r){return Tt(r,Jn)}function iu(r,t){let e=r.projectId;return r.isDefaultDatabase||(e+="."+r.database),"firestore/"+t+"/"+e+"/"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ou{constructor(t,e,n,s){this.targetId=t,this.fromCache=e,this.Is=n,this.ds=s}static Es(t,e){let n=$(),s=$();for(const i of e.docChanges)switch(i.type){case 0:n=n.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new ou(t,e.fromCache,n,s)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jy{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(t){this._documentReadCount+=t}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rf{constructor(){this.As=!1,this.Rs=!1,this.Vs=100,this.fs=function(){return Vh()?8:ed(zn())>0?6:4}()}initialize(t,e){this.gs=t,this.indexManager=e,this.As=!0}getDocumentsMatchingQuery(t,e,n,s){const i={result:null};return this.ps(t,e).next(o=>{i.result=o}).next(()=>{if(!i.result)return this.ys(t,e,s,n).next(o=>{i.result=o})}).next(()=>{if(i.result)return;const o=new Jy;return this.ws(t,e,o).next(u=>{if(i.result=u,this.Rs)return this.Ss(t,e,o,u.size)})}).next(()=>i.result)}Ss(t,e,n,s){return n.documentReadCount<this.Vs?(Mn()<=J.DEBUG&&N("QueryEngine","SDK will not create cache indexes for query:",Ln(e),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),A.resolve()):(Mn()<=J.DEBUG&&N("QueryEngine","Query:",Ln(e),"scans",n.documentReadCount,"local documents and returns",s,"documents as results."),n.documentReadCount>this.fs*s?(Mn()<=J.DEBUG&&N("QueryEngine","The SDK decides to create cache indexes for query:",Ln(e),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(t,Ot(e))):A.resolve())}ps(t,e){if(vl(e))return A.resolve(null);let n=Ot(e);return this.indexManager.getIndexType(t,n).next(s=>s===0?null:(e.limit!==null&&s===1&&(e=Pi(e,null,"F"),n=Ot(e)),this.indexManager.getDocumentsMatchingTarget(t,n).next(i=>{const o=$(...i);return this.gs.getDocuments(t,o).next(u=>this.indexManager.getMinOffset(t,n).next(c=>{const h=this.bs(e,u);return this.Ds(e,h,o,c.readTime)?this.ps(t,Pi(e,null,"F")):this.vs(t,h,e,c)}))})))}ys(t,e,n,s){return vl(e)||s.isEqual(j.min())?A.resolve(null):this.gs.getDocuments(t,n).next(i=>{const o=this.bs(e,i);return this.Ds(e,o,n,s)?A.resolve(null):(Mn()<=J.DEBUG&&N("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),Ln(e)),this.vs(t,o,e,Jh(s,Gn)).next(u=>u))})}bs(t,e){let n=new rt(Fd(t));return e.forEach((s,i)=>{Rs(t,i)&&(n=n.add(i))}),n}Ds(t,e,n,s){if(t.limit===null)return!1;if(n.size!==e.size)return!0;const i=t.limitType==="F"?e.last():e.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}ws(t,e,n){return Mn()<=J.DEBUG&&N("QueryEngine","Using full collection scan to execute query:",Ln(e)),this.gs.getDocumentsMatchingQuery(t,e,Qt.min(),n)}vs(t,e,n,s){return this.gs.getDocumentsMatchingQuery(t,n,s).next(i=>(e.forEach(o=>{i=i.insert(o.key,o)}),i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const au="LocalStore",Yy=3e8;class Zy{constructor(t,e,n,s){this.persistence=t,this.Cs=e,this.serializer=s,this.Fs=new ot(z),this.Ms=new pe(i=>mn(i),As),this.xs=new Map,this.Os=t.getRemoteDocumentCache(),this.hi=t.getTargetCache(),this.Ti=t.getBundleCache(),this.Ns(n)}Ns(t){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(t),this.indexManager=this.persistence.getIndexManager(t),this.mutationQueue=this.persistence.getMutationQueue(t,this.indexManager),this.localDocuments=new Af(this.Os,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Os.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(t){return this.persistence.runTransaction("Collect garbage","readwrite-primary",e=>t.collect(e,this.Fs))}}function Sf(r,t,e,n){return new Zy(r,t,e,n)}async function Pf(r,t){const e=O(r);return await e.persistence.runTransaction("Handle user change","readonly",n=>{let s;return e.mutationQueue.getAllMutationBatches(n).next(i=>(s=i,e.Ns(t),e.mutationQueue.getAllMutationBatches(n))).next(i=>{const o=[],u=[];let c=$();for(const h of s){o.push(h.batchId);for(const f of h.mutations)c=c.add(f.key)}for(const h of i){u.push(h.batchId);for(const f of h.mutations)c=c.add(f.key)}return e.localDocuments.getDocuments(n,c).next(h=>({Bs:h,removedBatchIds:o,addedBatchIds:u}))})})}function tI(r,t){const e=O(r);return e.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const s=t.batch.keys(),i=e.Os.newChangeBuffer({trackRemovals:!0});return function(u,c,h,f){const m=h.batch,g=m.keys();let w=A.resolve();return g.forEach(V=>{w=w.next(()=>f.getEntry(c,V)).next(D=>{const x=h.docVersions.get(V);U(x!==null,48541),D.version.compareTo(x)<0&&(m.applyToRemoteDocument(D,h),D.isValidDocument()&&(D.setReadTime(h.commitVersion),f.addEntry(D)))})}),w.next(()=>u.mutationQueue.removeMutationBatch(c,m))}(e,n,t,i).next(()=>i.apply(n)).next(()=>e.mutationQueue.performConsistencyCheck(n)).next(()=>e.documentOverlayCache.removeOverlaysForBatchId(n,s,t.batch.batchId)).next(()=>e.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(u){let c=$();for(let h=0;h<u.mutationResults.length;++h)u.mutationResults[h].transformResults.length>0&&(c=c.add(u.batch.mutations[h].key));return c}(t))).next(()=>e.localDocuments.getDocuments(n,s))})}function Vf(r){const t=O(r);return t.persistence.runTransaction("Get last remote snapshot version","readonly",e=>t.hi.getLastRemoteSnapshotVersion(e))}function eI(r,t){const e=O(r),n=t.snapshotVersion;let s=e.Fs;return e.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{const o=e.Os.newChangeBuffer({trackRemovals:!0});s=e.Fs;const u=[];t.targetChanges.forEach((f,m)=>{const g=s.get(m);if(!g)return;u.push(e.hi.removeMatchingKeys(i,f.removedDocuments,m).next(()=>e.hi.addMatchingKeys(i,f.addedDocuments,m)));let w=g.withSequenceNumber(i.currentSequenceNumber);t.targetMismatches.get(m)!==null?w=w.withResumeToken(ft.EMPTY_BYTE_STRING,j.min()).withLastLimboFreeSnapshotVersion(j.min()):f.resumeToken.approximateByteSize()>0&&(w=w.withResumeToken(f.resumeToken,n)),s=s.insert(m,w),function(D,x,L){return D.resumeToken.approximateByteSize()===0||x.snapshotVersion.toMicroseconds()-D.snapshotVersion.toMicroseconds()>=Yy?!0:L.addedDocuments.size+L.modifiedDocuments.size+L.removedDocuments.size>0}(g,w,f)&&u.push(e.hi.updateTargetData(i,w))});let c=jt(),h=$();if(t.documentUpdates.forEach(f=>{t.resolvedLimboDocuments.has(f)&&u.push(e.persistence.referenceDelegate.updateLimboDocument(i,f))}),u.push(Cf(i,o,t.documentUpdates).next(f=>{c=f.Ls,h=f.ks})),!n.isEqual(j.min())){const f=e.hi.getLastRemoteSnapshotVersion(i).next(m=>e.hi.setTargetsMetadata(i,i.currentSequenceNumber,n));u.push(f)}return A.waitFor(u).next(()=>o.apply(i)).next(()=>e.localDocuments.getLocalViewOfDocuments(i,c,h)).next(()=>c)}).then(i=>(e.Fs=s,i))}function Cf(r,t,e){let n=$(),s=$();return e.forEach(i=>n=n.add(i)),t.getEntries(r,n).next(i=>{let o=jt();return e.forEach((u,c)=>{const h=i.get(u);c.isFoundDocument()!==h.isFoundDocument()&&(s=s.add(u)),c.isNoDocument()&&c.version.isEqual(j.min())?(t.removeEntry(u,c.readTime),o=o.insert(u,c)):!h.isValidDocument()||c.version.compareTo(h.version)>0||c.version.compareTo(h.version)===0&&h.hasPendingWrites?(t.addEntry(c),o=o.insert(u,c)):N(au,"Ignoring outdated watch update for ",u,". Current version:",h.version," Watch version:",c.version)}),{Ls:o,ks:s}})}function nI(r,t){const e=O(r);return e.persistence.runTransaction("Get next mutation batch","readonly",n=>(t===void 0&&(t=xe),e.mutationQueue.getNextMutationBatchAfterBatchId(n,t)))}function sr(r,t){const e=O(r);return e.persistence.runTransaction("Allocate target","readwrite",n=>{let s;return e.hi.getTargetData(n,t).next(i=>i?(s=i,A.resolve(s)):e.hi.allocateTargetId(n).next(o=>(s=new ce(t,o,"TargetPurposeListen",n.currentSequenceNumber),e.hi.addTargetData(n,s).next(()=>s))))}).then(n=>{const s=e.Fs.get(n.targetId);return(s===null||n.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(e.Fs=e.Fs.insert(n.targetId,n),e.Ms.set(t,n.targetId)),n})}async function ir(r,t,e){const n=O(r),s=n.Fs.get(t),i=e?"readwrite":"readwrite-primary";try{e||await n.persistence.runTransaction("Release target",i,o=>n.persistence.referenceDelegate.removeTarget(o,s))}catch(o){if(!ze(o))throw o;N(au,`Failed to update sequence numbers for target ${t}: ${o}`)}n.Fs=n.Fs.remove(t),n.Ms.delete(s.target)}function ki(r,t,e){const n=O(r);let s=j.min(),i=$();return n.persistence.runTransaction("Execute query","readwrite",o=>function(c,h,f){const m=O(c),g=m.Ms.get(f);return g!==void 0?A.resolve(m.Fs.get(g)):m.hi.getTargetData(h,f)}(n,o,Ot(t)).next(u=>{if(u)return s=u.lastLimboFreeSnapshotVersion,n.hi.getMatchingKeysForTargetId(o,u.targetId).next(c=>{i=c})}).next(()=>n.Cs.getDocumentsMatchingQuery(o,t,e?s:j.min(),e?i:$())).next(u=>(Nf(n,Od(t),u),{documents:u,qs:i})))}function Df(r,t){const e=O(r),n=O(e.hi),s=e.Fs.get(t);return s?Promise.resolve(s.target):e.persistence.runTransaction("Get target data","readonly",i=>n.Et(i,t).next(o=>o?o.target:null))}function xf(r,t){const e=O(r),n=e.xs.get(t)||j.min();return e.persistence.runTransaction("Get new document changes","readonly",s=>e.Os.getAllFromCollectionGroup(s,t,Jh(n,Gn),Number.MAX_SAFE_INTEGER)).then(s=>(Nf(e,t,s),s))}function Nf(r,t,e){let n=r.xs.get(t)||j.min();e.forEach((s,i)=>{i.readTime.compareTo(n)>0&&(n=i.readTime)}),r.xs.set(t,n)}async function rI(r,t,e,n){const s=O(r);let i=$(),o=jt();for(const h of e){const f=t.Qs(h.metadata.name);h.document&&(i=i.add(f));const m=t.$s(h);m.setReadTime(t.Us(h.metadata.readTime)),o=o.insert(f,m)}const u=s.Os.newChangeBuffer({trackRemovals:!0}),c=await sr(s,function(f){return Ot(fr(Q.fromString(`__bundle__/docs/${f}`)))}(n));return s.persistence.runTransaction("Apply bundle documents","readwrite",h=>Cf(h,u,o).next(f=>(u.apply(h),f)).next(f=>s.hi.removeMatchingKeysForTargetId(h,c.targetId).next(()=>s.hi.addMatchingKeys(h,i,c.targetId)).next(()=>s.localDocuments.getLocalViewOfDocuments(h,f.Ls,f.ks)).next(()=>f.Ls)))}async function sI(r,t,e=$()){const n=await sr(r,Ot(to(t.bundledQuery))),s=O(r);return s.persistence.runTransaction("Save named query","readwrite",i=>{const o=gt(t.readTime);if(n.snapshotVersion.compareTo(o)>=0)return s.Ti.saveNamedQuery(i,t);const u=n.withResumeToken(ft.EMPTY_BYTE_STRING,o);return s.Fs=s.Fs.insert(u.targetId,u),s.hi.updateTargetData(i,u).next(()=>s.hi.removeMatchingKeysForTargetId(i,n.targetId)).next(()=>s.hi.addMatchingKeys(i,e,n.targetId)).next(()=>s.Ti.saveNamedQuery(i,t))})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kf="firestore_clients";function Zl(r,t){return`${kf}_${r}_${t}`}const Of="firestore_mutations";function th(r,t,e){let n=`${Of}_${r}_${e}`;return t.isAuthenticated()&&(n+=`_${t.uid}`),n}const Ff="firestore_targets";function Wo(r,t){return`${Ff}_${r}_${t}`}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const te="SharedClientState";class Oi{constructor(t,e,n,s){this.user=t,this.batchId=e,this.state=n,this.error=s}static Ks(t,e,n){const s=JSON.parse(n);let i,o=typeof s=="object"&&["pending","acknowledged","rejected"].indexOf(s.state)!==-1&&(s.error===void 0||typeof s.error=="object");return o&&s.error&&(o=typeof s.error.message=="string"&&typeof s.error.code=="string",o&&(i=new C(s.error.code,s.error.message))),o?new Oi(t,e,s.state,i):(pt(te,`Failed to parse mutation state for ID '${e}': ${n}`),null)}Ws(){const t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t)}}class is{constructor(t,e,n){this.targetId=t,this.state=e,this.error=n}static Ks(t,e){const n=JSON.parse(e);let s,i=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return i&&n.error&&(i=typeof n.error.message=="string"&&typeof n.error.code=="string",i&&(s=new C(n.error.code,n.error.message))),i?new is(t,n.state,s):(pt(te,`Failed to parse target state for ID '${t}': ${e}`),null)}Ws(){const t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t)}}class Fi{constructor(t,e){this.clientId=t,this.activeTargetIds=e}static Ks(t,e){const n=JSON.parse(e);let s=typeof n=="object"&&n.activeTargetIds instanceof Array,i=Ka();for(let o=0;s&&o<n.activeTargetIds.length;++o)s=nd(n.activeTargetIds[o]),i=i.add(n.activeTargetIds[o]);return s?new Fi(t,i):(pt(te,`Failed to parse client data for instance '${t}': ${e}`),null)}}class uu{constructor(t,e){this.clientId=t,this.onlineState=e}static Ks(t){const e=JSON.parse(t);return typeof e=="object"&&["Unknown","Online","Offline"].indexOf(e.onlineState)!==-1&&typeof e.clientId=="string"?new uu(e.clientId,e.onlineState):(pt(te,`Failed to parse online state: ${t}`),null)}}class Aa{constructor(){this.activeTargetIds=Ka()}Gs(t){this.activeTargetIds=this.activeTargetIds.add(t)}zs(t){this.activeTargetIds=this.activeTargetIds.delete(t)}Ws(){const t={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(t)}}class Ho{constructor(t,e,n,s,i){this.window=t,this.Fi=e,this.persistenceKey=n,this.js=s,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.Js=this.Hs.bind(this),this.Ys=new ot(z),this.started=!1,this.Zs=[];const o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=i,this.Xs=Zl(this.persistenceKey,this.js),this.eo=function(c){return`firestore_sequence_number_${c}`}(this.persistenceKey),this.Ys=this.Ys.insert(this.js,new Aa),this.no=new RegExp(`^${kf}_${o}_([^_]*)$`),this.ro=new RegExp(`^${Of}_${o}_(\\d+)(?:_(.*))?$`),this.io=new RegExp(`^${Ff}_${o}_(\\d+)$`),this.so=function(c){return`firestore_online_state_${c}`}(this.persistenceKey),this.oo=function(c){return`firestore_bundle_loaded_v2_${c}`}(this.persistenceKey),this.window.addEventListener("storage",this.Js)}static C(t){return!(!t||!t.localStorage)}async start(){const t=await this.syncEngine.Ps();for(const n of t){if(n===this.js)continue;const s=this.getItem(Zl(this.persistenceKey,n));if(s){const i=Fi.Ks(n,s);i&&(this.Ys=this.Ys.insert(i.clientId,i))}}this._o();const e=this.storage.getItem(this.so);if(e){const n=this.ao(e);n&&this.uo(n)}for(const n of this.Zs)this.Hs(n);this.Zs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(t){this.setItem(this.eo,JSON.stringify(t))}getAllActiveQueryTargets(){return this.co(this.Ys)}isActiveQueryTarget(t){let e=!1;return this.Ys.forEach((n,s)=>{s.activeTargetIds.has(t)&&(e=!0)}),e}addPendingMutation(t){this.lo(t,"pending")}updateMutationState(t,e,n){this.lo(t,e,n),this.ho(t)}addLocalQueryTarget(t,e=!0){let n="not-current";if(this.isActiveQueryTarget(t)){const s=this.storage.getItem(Wo(this.persistenceKey,t));if(s){const i=is.Ks(t,s);i&&(n=i.state)}}return e&&this.Po.Gs(t),this._o(),n}removeLocalQueryTarget(t){this.Po.zs(t),this._o()}isLocalQueryTarget(t){return this.Po.activeTargetIds.has(t)}clearQueryState(t){this.removeItem(Wo(this.persistenceKey,t))}updateQueryState(t,e,n){this.To(t,e,n)}handleUserChange(t,e,n){e.forEach(s=>{this.ho(s)}),this.currentUser=t,n.forEach(s=>{this.addPendingMutation(s)})}setOnlineState(t){this.Io(t)}notifyBundleLoaded(t){this.Eo(t)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.Js),this.removeItem(this.Xs),this.started=!1)}getItem(t){const e=this.storage.getItem(t);return N(te,"READ",t,e),e}setItem(t,e){N(te,"SET",t,e),this.storage.setItem(t,e)}removeItem(t){N(te,"REMOVE",t),this.storage.removeItem(t)}Hs(t){const e=t;if(e.storageArea===this.storage){if(N(te,"EVENT",e.key,e.newValue),e.key===this.Xs)return void pt("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Fi.enqueueRetryable(async()=>{if(this.started){if(e.key!==null){if(this.no.test(e.key)){if(e.newValue==null){const n=this.Ao(e.key);return this.Ro(n,null)}{const n=this.Vo(e.key,e.newValue);if(n)return this.Ro(n.clientId,n)}}else if(this.ro.test(e.key)){if(e.newValue!==null){const n=this.mo(e.key,e.newValue);if(n)return this.fo(n)}}else if(this.io.test(e.key)){if(e.newValue!==null){const n=this.po(e.key,e.newValue);if(n)return this.yo(n)}}else if(e.key===this.so){if(e.newValue!==null){const n=this.ao(e.newValue);if(n)return this.uo(n)}}else if(e.key===this.eo){const n=function(i){let o=Ut.ue;if(i!=null)try{const u=JSON.parse(i);U(typeof u=="number",30636,{wo:i}),o=u}catch(u){pt(te,"Failed to read sequence number from WebStorage",u)}return o}(e.newValue);n!==Ut.ue&&this.sequenceNumberHandler(n)}else if(e.key===this.oo){const n=this.So(e.newValue);await Promise.all(n.map(s=>this.syncEngine.bo(s)))}}}else this.Zs.push(e)})}}get Po(){return this.Ys.get(this.js)}_o(){this.setItem(this.Xs,this.Po.Ws())}lo(t,e,n){const s=new Oi(this.currentUser,t,e,n),i=th(this.persistenceKey,this.currentUser,t);this.setItem(i,s.Ws())}ho(t){const e=th(this.persistenceKey,this.currentUser,t);this.removeItem(e)}Io(t){const e={clientId:this.js,onlineState:t};this.storage.setItem(this.so,JSON.stringify(e))}To(t,e,n){const s=Wo(this.persistenceKey,t),i=new is(t,e,n);this.setItem(s,i.Ws())}Eo(t){const e=JSON.stringify(Array.from(t));this.setItem(this.oo,e)}Ao(t){const e=this.no.exec(t);return e?e[1]:null}Vo(t,e){const n=this.Ao(t);return Fi.Ks(n,e)}mo(t,e){const n=this.ro.exec(t),s=Number(n[1]),i=n[2]!==void 0?n[2]:null;return Oi.Ks(new wt(i),s,e)}po(t,e){const n=this.io.exec(t),s=Number(n[1]);return is.Ks(s,e)}ao(t){return uu.Ks(t)}So(t){return JSON.parse(t)}async fo(t){if(t.user.uid===this.currentUser.uid)return this.syncEngine.Do(t.batchId,t.state,t.error);N(te,`Ignoring mutation for non-active user ${t.user.uid}`)}yo(t){return this.syncEngine.vo(t.targetId,t.state,t.error)}Ro(t,e){const n=e?this.Ys.insert(t,e):this.Ys.remove(t),s=this.co(this.Ys),i=this.co(n),o=[],u=[];return i.forEach(c=>{s.has(c)||o.push(c)}),s.forEach(c=>{i.has(c)||u.push(c)}),this.syncEngine.Co(o,u).then(()=>{this.Ys=n})}uo(t){this.Ys.get(t.clientId)&&this.onlineStateHandler(t.onlineState)}co(t){let e=Ka();return t.forEach((n,s)=>{e=e.unionWith(s.activeTargetIds)}),e}}class Mf{constructor(){this.Fo=new Aa,this.Mo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(t){}updateMutationState(t,e,n){}addLocalQueryTarget(t,e=!0){return e&&this.Fo.Gs(t),this.Mo[t]||"not-current"}updateQueryState(t,e,n){this.Mo[t]=e}removeLocalQueryTarget(t){this.Fo.zs(t)}isLocalQueryTarget(t){return this.Fo.activeTargetIds.has(t)}clearQueryState(t){delete this.Mo[t]}getAllActiveQueryTargets(){return this.Fo.activeTargetIds}isActiveQueryTarget(t){return this.Fo.activeTargetIds.has(t)}start(){return this.Fo=new Aa,Promise.resolve()}handleUserChange(t,e,n){}setOnlineState(t){}shutdown(){}writeSequenceNumber(t){}notifyBundleLoaded(t){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iI{xo(t){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eh="ConnectivityMonitor";class nh{constructor(){this.Oo=()=>this.No(),this.Bo=()=>this.Lo(),this.ko=[],this.qo()}xo(t){this.ko.push(t)}shutdown(){window.removeEventListener("online",this.Oo),window.removeEventListener("offline",this.Bo)}qo(){window.addEventListener("online",this.Oo),window.addEventListener("offline",this.Bo)}No(){N(eh,"Network connectivity changed: AVAILABLE");for(const t of this.ko)t(0)}Lo(){N(eh,"Network connectivity changed: UNAVAILABLE");for(const t of this.ko)t(1)}static C(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ai=null;function ba(){return ai===null?ai=function(){return 268435456+Math.round(2147483648*Math.random())}():ai++,"0x"+ai.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xo="RestConnection",oI={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class aI{get Qo(){return!1}constructor(t){this.databaseInfo=t,this.databaseId=t.databaseId;const e=t.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.$o=e+"://"+t.host,this.Uo=`projects/${n}/databases/${s}`,this.Ko=this.databaseId.database===ms?`project_id=${n}`:`project_id=${n}&database_id=${s}`}Wo(t,e,n,s,i){const o=ba(),u=this.Go(t,e.toUriEncodedString());N(Xo,`Sending RPC '${t}' ${o}:`,u,n);const c={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.Ko};this.zo(c,s,i);const{host:h}=new URL(u),f=Ui(h);return this.jo(t,u,c,n,f).then(m=>(N(Xo,`Received RPC '${t}' ${o}: `,m),m),m=>{throw Ft(Xo,`RPC '${t}' ${o} failed with error: `,m,"url: ",u,"request:",n),m})}Jo(t,e,n,s,i,o){return this.Wo(t,e,n,s,i)}zo(t,e,n){t["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+dr}(),t["Content-Type"]="text/plain",this.databaseInfo.appId&&(t["X-Firebase-GMPID"]=this.databaseInfo.appId),e&&e.headers.forEach((s,i)=>t[i]=s),n&&n.headers.forEach((s,i)=>t[i]=s)}Go(t,e){const n=oI[t];return`${this.$o}/v1/${e}:${n}`}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uI{constructor(t){this.Ho=t.Ho,this.Yo=t.Yo}Zo(t){this.Xo=t}e_(t){this.t_=t}n_(t){this.r_=t}onMessage(t){this.i_=t}close(){this.Yo()}send(t){this.Ho(t)}s_(){this.Xo()}o_(){this.t_()}__(t){this.r_(t)}a_(t){this.i_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xt="WebChannelConnection";class cI extends aI{constructor(t){super(t),this.u_=[],this.forceLongPolling=t.forceLongPolling,this.autoDetectLongPolling=t.autoDetectLongPolling,this.useFetchStreams=t.useFetchStreams,this.longPollingOptions=t.longPollingOptions}jo(t,e,n,s,i){const o=ba();return new Promise((u,c)=>{const h=new Bh;h.setWithCredentials(!0),h.listenOnce(Uh.COMPLETE,()=>{try{switch(h.getLastErrorCode()){case ci.NO_ERROR:const m=h.getResponseJson();N(xt,`XHR for RPC '${t}' ${o} received:`,JSON.stringify(m)),u(m);break;case ci.TIMEOUT:N(xt,`RPC '${t}' ${o} timed out`),c(new C(R.DEADLINE_EXCEEDED,"Request time out"));break;case ci.HTTP_ERROR:const g=h.getStatus();if(N(xt,`RPC '${t}' ${o} failed with status:`,g,"response text:",h.getResponseText()),g>0){let w=h.getResponseJson();Array.isArray(w)&&(w=w[0]);const V=w?.error;if(V&&V.status&&V.message){const D=function(L){const q=L.toLowerCase().replace(/_/g,"-");return Object.values(R).indexOf(q)>=0?q:R.UNKNOWN}(V.status);c(new C(D,V.message))}else c(new C(R.UNKNOWN,"Server responded with status "+h.getStatus()))}else c(new C(R.UNAVAILABLE,"Connection failed."));break;default:M(9055,{c_:t,streamId:o,l_:h.getLastErrorCode(),h_:h.getLastError()})}}finally{N(xt,`RPC '${t}' ${o} completed.`)}});const f=JSON.stringify(s);N(xt,`RPC '${t}' ${o} sending request:`,s),h.send(e,"POST",f,n,15)})}P_(t,e,n){const s=ba(),i=[this.$o,"/","google.firestore.v1.Firestore","/",t,"/channel"],o=zh(),u=jh(),c={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},h=this.longPollingOptions.timeoutSeconds;h!==void 0&&(c.longPollingTimeout=Math.round(1e3*h)),this.useFetchStreams&&(c.useFetchStreams=!0),this.zo(c.initMessageHeaders,e,n),c.encodeInitMessageHeaders=!0;const f=i.join("");N(xt,`Creating RPC '${t}' stream ${s}: ${f}`,c);const m=o.createWebChannel(f,c);this.T_(m);let g=!1,w=!1;const V=new uI({Ho:x=>{w?N(xt,`Not sending because RPC '${t}' stream ${s} is closed:`,x):(g||(N(xt,`Opening RPC '${t}' stream ${s} transport.`),m.open(),g=!0),N(xt,`RPC '${t}' stream ${s} sending:`,x),m.send(x))},Yo:()=>m.close()}),D=(x,L,q)=>{x.listen(L,B=>{try{q(B)}catch(K){setTimeout(()=>{throw K},0)}})};return D(m,Kr.EventType.OPEN,()=>{w||(N(xt,`RPC '${t}' stream ${s} transport opened.`),V.s_())}),D(m,Kr.EventType.CLOSE,()=>{w||(w=!0,N(xt,`RPC '${t}' stream ${s} transport closed`),V.__(),this.I_(m))}),D(m,Kr.EventType.ERROR,x=>{w||(w=!0,Ft(xt,`RPC '${t}' stream ${s} transport errored. Name:`,x.name,"Message:",x.message),V.__(new C(R.UNAVAILABLE,"The operation could not be completed")))}),D(m,Kr.EventType.MESSAGE,x=>{var L;if(!w){const q=x.data[0];U(!!q,16349);const B=q,K=B?.error||((L=B[0])===null||L===void 0?void 0:L.error);if(K){N(xt,`RPC '${t}' stream ${s} received error:`,K);const tt=K.status;let G=function(I){const T=_t[I];if(T!==void 0)return Xd(T)}(tt),E=K.message;G===void 0&&(G=R.INTERNAL,E="Unknown error status: "+tt+" with message "+K.message),w=!0,V.__(new C(G,E)),m.close()}else N(xt,`RPC '${t}' stream ${s} received:`,q),V.a_(q)}}),D(u,qh.STAT_EVENT,x=>{x.stat===na.PROXY?N(xt,`RPC '${t}' stream ${s} detected buffering proxy`):x.stat===na.NOPROXY&&N(xt,`RPC '${t}' stream ${s} detected no buffering proxy`)}),setTimeout(()=>{V.o_()},0),V}terminate(){this.u_.forEach(t=>t.close()),this.u_=[]}T_(t){this.u_.push(t)}I_(t){this.u_=this.u_.filter(e=>e===t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Lf(){return typeof window<"u"?window:null}function yi(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wn(r){return new py(r,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cu{constructor(t,e,n=1e3,s=1.5,i=6e4){this.Fi=t,this.timerId=e,this.d_=n,this.E_=s,this.A_=i,this.R_=0,this.V_=null,this.m_=Date.now(),this.reset()}reset(){this.R_=0}f_(){this.R_=this.A_}g_(t){this.cancel();const e=Math.floor(this.R_+this.p_()),n=Math.max(0,Date.now()-this.m_),s=Math.max(0,e-n);s>0&&N("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.R_} ms, delay with jitter: ${e} ms, last attempt: ${n} ms ago)`),this.V_=this.Fi.enqueueAfterDelay(this.timerId,s,()=>(this.m_=Date.now(),t())),this.R_*=this.E_,this.R_<this.d_&&(this.R_=this.d_),this.R_>this.A_&&(this.R_=this.A_)}y_(){this.V_!==null&&(this.V_.skipDelay(),this.V_=null)}cancel(){this.V_!==null&&(this.V_.cancel(),this.V_=null)}p_(){return(Math.random()-.5)*this.R_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rh="PersistentStream";class Bf{constructor(t,e,n,s,i,o,u,c){this.Fi=t,this.w_=n,this.S_=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=u,this.listener=c,this.state=0,this.b_=0,this.D_=null,this.v_=null,this.stream=null,this.C_=0,this.F_=new cu(t,e)}M_(){return this.state===1||this.state===5||this.x_()}x_(){return this.state===2||this.state===3}start(){this.C_=0,this.state!==4?this.auth():this.O_()}async stop(){this.M_()&&await this.close(0)}N_(){this.state=0,this.F_.reset()}B_(){this.x_()&&this.D_===null&&(this.D_=this.Fi.enqueueAfterDelay(this.w_,6e4,()=>this.L_()))}k_(t){this.q_(),this.stream.send(t)}async L_(){if(this.x_())return this.close(0)}q_(){this.D_&&(this.D_.cancel(),this.D_=null)}Q_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(t,e){this.q_(),this.Q_(),this.F_.cancel(),this.b_++,t!==4?this.F_.reset():e&&e.code===R.RESOURCE_EXHAUSTED?(pt(e.toString()),pt("Using maximum backoff delay to prevent overloading the backend."),this.F_.f_()):e&&e.code===R.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.U_(),this.stream.close(),this.stream=null),this.state=t,await this.listener.n_(e)}U_(){}auth(){this.state=1;const t=this.K_(this.b_),e=this.b_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,s])=>{this.b_===e&&this.W_(n,s)},n=>{t(()=>{const s=new C(R.UNKNOWN,"Fetching auth token failed: "+n.message);return this.G_(s)})})}W_(t,e){const n=this.K_(this.b_);this.stream=this.z_(t,e),this.stream.Zo(()=>{n(()=>this.listener.Zo())}),this.stream.e_(()=>{n(()=>(this.state=2,this.v_=this.Fi.enqueueAfterDelay(this.S_,1e4,()=>(this.x_()&&(this.state=3),Promise.resolve())),this.listener.e_()))}),this.stream.n_(s=>{n(()=>this.G_(s))}),this.stream.onMessage(s=>{n(()=>++this.C_==1?this.j_(s):this.onNext(s))})}O_(){this.state=5,this.F_.g_(async()=>{this.state=0,this.start()})}G_(t){return N(rh,`close with error: ${t}`),this.stream=null,this.close(4,t)}K_(t){return e=>{this.Fi.enqueueAndForget(()=>this.b_===t?e():(N(rh,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class lI extends Bf{constructor(t,e,n,s,i,o){super(t,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",e,n,s,o),this.serializer=i}z_(t,e){return this.connection.P_("Listen",t,e)}j_(t){return this.onNext(t)}onNext(t){this.F_.reset();const e=yy(this.serializer,t),n=function(i){if(!("targetChange"in i))return j.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?j.min():o.readTime?gt(o.readTime):j.min()}(t);return this.listener.J_(e,n)}H_(t){const e={};e.database=Ia(this.serializer),e.addTarget=function(i,o){let u;const c=o.target;if(u=Ri(c)?{documents:sf(i,c)}:{query:Zi(i,c).Vt},u.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){u.resumeToken=Zd(i,o.resumeToken);const h=_a(i,o.expectedCount);h!==null&&(u.expectedCount=h)}else if(o.snapshotVersion.compareTo(j.min())>0){u.readTime=rr(i,o.snapshotVersion.toTimestamp());const h=_a(i,o.expectedCount);h!==null&&(u.expectedCount=h)}return u}(this.serializer,t);const n=Ey(this.serializer,t);n&&(e.labels=n),this.k_(e)}Y_(t){const e={};e.database=Ia(this.serializer),e.removeTarget=t,this.k_(e)}}class hI extends Bf{constructor(t,e,n,s,i,o){super(t,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",e,n,s,o),this.serializer=i}get Z_(){return this.C_>0}start(){this.lastStreamToken=void 0,super.start()}U_(){this.Z_&&this.X_([])}z_(t,e){return this.connection.P_("Write",t,e)}j_(t){return U(!!t.streamToken,31322),this.lastStreamToken=t.streamToken,U(!t.writeResults||t.writeResults.length===0,55816),this.listener.ea()}onNext(t){U(!!t.streamToken,12678),this.lastStreamToken=t.streamToken,this.F_.reset();const e=Iy(t.writeResults,t.commitTime),n=gt(t.commitTime);return this.listener.ta(n,e)}na(){const t={};t.database=Ia(this.serializer),this.k_(t)}X_(t){const e={streamToken:this.lastStreamToken,writes:t.map(n=>Is(this.serializer,n))};this.k_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dI{}class fI extends dI{constructor(t,e,n,s){super(),this.authCredentials=t,this.appCheckCredentials=e,this.connection=n,this.serializer=s,this.ra=!1}ia(){if(this.ra)throw new C(R.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(t,e,n,s){return this.ia(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.Wo(t,ya(e,n),s,i,o)).catch(i=>{throw i.name==="FirebaseError"?(i.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new C(R.UNKNOWN,i.toString())})}Jo(t,e,n,s,i){return this.ia(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,u])=>this.connection.Jo(t,ya(e,n),s,o,u,i)).catch(o=>{throw o.name==="FirebaseError"?(o.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new C(R.UNKNOWN,o.toString())})}terminate(){this.ra=!0,this.connection.terminate()}}class mI{constructor(t,e){this.asyncQueue=t,this.onlineStateHandler=e,this.state="Unknown",this.sa=0,this.oa=null,this._a=!0}aa(){this.sa===0&&(this.ua("Unknown"),this.oa=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this.oa=null,this.ca("Backend didn't respond within 10 seconds."),this.ua("Offline"),Promise.resolve())))}la(t){this.state==="Online"?this.ua("Unknown"):(this.sa++,this.sa>=1&&(this.ha(),this.ca(`Connection failed 1 times. Most recent error: ${t.toString()}`),this.ua("Offline")))}set(t){this.ha(),this.sa=0,t==="Online"&&(this._a=!1),this.ua(t)}ua(t){t!==this.state&&(this.state=t,this.onlineStateHandler(t))}ca(t){const e=`Could not reach Cloud Firestore backend. ${t}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this._a?(pt(e),this._a=!1):N("OnlineStateTracker",e)}ha(){this.oa!==null&&(this.oa.cancel(),this.oa=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const En="RemoteStore";class pI{constructor(t,e,n,s,i){this.localStore=t,this.datastore=e,this.asyncQueue=n,this.remoteSyncer={},this.Pa=[],this.Ta=new Map,this.Ia=new Set,this.da=[],this.Ea=i,this.Ea.xo(o=>{n.enqueueAndForget(async()=>{Ge(this)&&(N(En,"Restarting streams for network reachability change."),await async function(c){const h=O(c);h.Ia.add(4),await gr(h),h.Aa.set("Unknown"),h.Ia.delete(4),await Cs(h)}(this))})}),this.Aa=new mI(n,s)}}async function Cs(r){if(Ge(r))for(const t of r.da)await t(!0)}async function gr(r){for(const t of r.da)await t(!1)}function so(r,t){const e=O(r);e.Ta.has(t.targetId)||(e.Ta.set(t.targetId,t),du(e)?hu(e):yr(e).x_()&&lu(e,t))}function or(r,t){const e=O(r),n=yr(e);e.Ta.delete(t),n.x_()&&Uf(e,t),e.Ta.size===0&&(n.x_()?n.B_():Ge(e)&&e.Aa.set("Unknown"))}function lu(r,t){if(r.Ra.$e(t.targetId),t.resumeToken.approximateByteSize()>0||t.snapshotVersion.compareTo(j.min())>0){const e=r.remoteSyncer.getRemoteKeysForTarget(t.targetId).size;t=t.withExpectedCount(e)}yr(r).H_(t)}function Uf(r,t){r.Ra.$e(t),yr(r).Y_(t)}function hu(r){r.Ra=new hy({getRemoteKeysForTarget:t=>r.remoteSyncer.getRemoteKeysForTarget(t),Et:t=>r.Ta.get(t)||null,lt:()=>r.datastore.serializer.databaseId}),yr(r).start(),r.Aa.aa()}function du(r){return Ge(r)&&!yr(r).M_()&&r.Ta.size>0}function Ge(r){return O(r).Ia.size===0}function qf(r){r.Ra=void 0}async function gI(r){r.Aa.set("Online")}async function _I(r){r.Ta.forEach((t,e)=>{lu(r,t)})}async function yI(r,t){qf(r),du(r)?(r.Aa.la(t),hu(r)):r.Aa.set("Unknown")}async function II(r,t,e){if(r.Aa.set("Online"),t instanceof Yd&&t.state===2&&t.cause)try{await async function(s,i){const o=i.cause;for(const u of i.targetIds)s.Ta.has(u)&&(await s.remoteSyncer.rejectListen(u,o),s.Ta.delete(u),s.Ra.removeTarget(u))}(r,t)}catch(n){N(En,"Failed to remove targets %s: %s ",t.targetIds.join(","),n),await Mi(r,n)}else if(t instanceof gi?r.Ra.Ye(t):t instanceof Jd?r.Ra.it(t):r.Ra.et(t),!e.isEqual(j.min()))try{const n=await Vf(r.localStore);e.compareTo(n)>=0&&await function(i,o){const u=i.Ra.Pt(o);return u.targetChanges.forEach((c,h)=>{if(c.resumeToken.approximateByteSize()>0){const f=i.Ta.get(h);f&&i.Ta.set(h,f.withResumeToken(c.resumeToken,o))}}),u.targetMismatches.forEach((c,h)=>{const f=i.Ta.get(c);if(!f)return;i.Ta.set(c,f.withResumeToken(ft.EMPTY_BYTE_STRING,f.snapshotVersion)),Uf(i,c);const m=new ce(f.target,c,h,f.sequenceNumber);lu(i,m)}),i.remoteSyncer.applyRemoteEvent(u)}(r,e)}catch(n){N(En,"Failed to raise snapshot:",n),await Mi(r,n)}}async function Mi(r,t,e){if(!ze(t))throw t;r.Ia.add(1),await gr(r),r.Aa.set("Offline"),e||(e=()=>Vf(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{N(En,"Retrying IndexedDB access"),await e(),r.Ia.delete(1),await Cs(r)})}function jf(r,t){return t().catch(e=>Mi(r,e,t))}async function _r(r){const t=O(r),e=Be(t);let n=t.Pa.length>0?t.Pa[t.Pa.length-1].batchId:xe;for(;EI(t);)try{const s=await nI(t.localStore,n);if(s===null){t.Pa.length===0&&e.B_();break}n=s.batchId,TI(t,s)}catch(s){await Mi(t,s)}zf(t)&&$f(t)}function EI(r){return Ge(r)&&r.Pa.length<10}function TI(r,t){r.Pa.push(t);const e=Be(r);e.x_()&&e.Z_&&e.X_(t.mutations)}function zf(r){return Ge(r)&&!Be(r).M_()&&r.Pa.length>0}function $f(r){Be(r).start()}async function vI(r){Be(r).na()}async function wI(r){const t=Be(r);for(const e of r.Pa)t.X_(e.mutations)}async function AI(r,t,e){const n=r.Pa.shift(),s=Xa.from(n,t,e);await jf(r,()=>r.remoteSyncer.applySuccessfulWrite(s)),await _r(r)}async function bI(r,t){t&&Be(r).Z_&&await async function(n,s){if(function(o){return Hd(o)&&o!==R.ABORTED}(s.code)){const i=n.Pa.shift();Be(n).N_(),await jf(n,()=>n.remoteSyncer.rejectFailedWrite(i.batchId,s)),await _r(n)}}(r,t),zf(r)&&$f(r)}async function sh(r,t){const e=O(r);e.asyncQueue.verifyOperationInProgress(),N(En,"RemoteStore received new credentials");const n=Ge(e);e.Ia.add(3),await gr(e),n&&e.Aa.set("Unknown"),await e.remoteSyncer.handleCredentialChange(t),e.Ia.delete(3),await Cs(e)}async function Ra(r,t){const e=O(r);t?(e.Ia.delete(2),await Cs(e)):t||(e.Ia.add(2),await gr(e),e.Aa.set("Unknown"))}function yr(r){return r.Va||(r.Va=function(e,n,s){const i=O(e);return i.ia(),new lI(n,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(r.datastore,r.asyncQueue,{Zo:gI.bind(null,r),e_:_I.bind(null,r),n_:yI.bind(null,r),J_:II.bind(null,r)}),r.da.push(async t=>{t?(r.Va.N_(),du(r)?hu(r):r.Aa.set("Unknown")):(await r.Va.stop(),qf(r))})),r.Va}function Be(r){return r.ma||(r.ma=function(e,n,s){const i=O(e);return i.ia(),new hI(n,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(r.datastore,r.asyncQueue,{Zo:()=>Promise.resolve(),e_:vI.bind(null,r),n_:bI.bind(null,r),ea:wI.bind(null,r),ta:AI.bind(null,r)}),r.da.push(async t=>{t?(r.ma.N_(),await _r(r)):(await r.ma.stop(),r.Pa.length>0&&(N(En,`Stopping write stream with ${r.Pa.length} pending writes`),r.Pa=[]))})),r.ma}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fu{constructor(t,e,n,s,i){this.asyncQueue=t,this.timerId=e,this.targetTimeMs=n,this.op=s,this.removalCallback=i,this.deferred=new At,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(t,e,n,s,i){const o=Date.now()+n,u=new fu(t,e,o,s,i);return u.start(n),u}start(t){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),t)}skipDelay(){return this.handleDelayElapsed()}cancel(t){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new C(R.CANCELLED,"Operation cancelled"+(t?": "+t:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(t=>this.deferred.resolve(t))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Ir(r,t){if(pt("AsyncQueue",`${t}: ${r}`),ze(r))return new C(R.UNAVAILABLE,`${t}: ${r}`);throw r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dn{static emptySet(t){return new dn(t.comparator)}constructor(t){this.comparator=t?(e,n)=>t(e,n)||k.comparator(e.key,n.key):(e,n)=>k.comparator(e.key,n.key),this.keyedMap=Qr(),this.sortedSet=new ot(this.comparator)}has(t){return this.keyedMap.get(t)!=null}get(t){return this.keyedMap.get(t)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(t){const e=this.keyedMap.get(t);return e?this.sortedSet.indexOf(e):-1}get size(){return this.sortedSet.size}forEach(t){this.sortedSet.inorderTraversal((e,n)=>(t(e),!1))}add(t){const e=this.delete(t.key);return e.copy(e.keyedMap.insert(t.key,t),e.sortedSet.insert(t,null))}delete(t){const e=this.get(t);return e?this.copy(this.keyedMap.remove(t),this.sortedSet.remove(e)):this}isEqual(t){if(!(t instanceof dn)||this.size!==t.size)return!1;const e=this.sortedSet.getIterator(),n=t.sortedSet.getIterator();for(;e.hasNext();){const s=e.getNext().key,i=n.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const t=[];return this.forEach(e=>{t.push(e.toString())}),t.length===0?"DocumentSet ()":`DocumentSet (
  `+t.join(`  
`)+`
)`}copy(t,e){const n=new dn;return n.comparator=this.comparator,n.keyedMap=t,n.sortedSet=e,n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ih{constructor(){this.fa=new ot(k.comparator)}track(t){const e=t.doc.key,n=this.fa.get(e);n?t.type!==0&&n.type===3?this.fa=this.fa.insert(e,t):t.type===3&&n.type!==1?this.fa=this.fa.insert(e,{type:n.type,doc:t.doc}):t.type===2&&n.type===2?this.fa=this.fa.insert(e,{type:2,doc:t.doc}):t.type===2&&n.type===0?this.fa=this.fa.insert(e,{type:0,doc:t.doc}):t.type===1&&n.type===0?this.fa=this.fa.remove(e):t.type===1&&n.type===2?this.fa=this.fa.insert(e,{type:1,doc:n.doc}):t.type===0&&n.type===1?this.fa=this.fa.insert(e,{type:2,doc:t.doc}):M(63341,{At:t,ga:n}):this.fa=this.fa.insert(e,t)}pa(){const t=[];return this.fa.inorderTraversal((e,n)=>{t.push(n)}),t}}class Tn{constructor(t,e,n,s,i,o,u,c,h){this.query=t,this.docs=e,this.oldDocs=n,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=u,this.excludesMetadataChanges=c,this.hasCachedResults=h}static fromInitialDocuments(t,e,n,s,i){const o=[];return e.forEach(u=>{o.push({type:0,doc:u})}),new Tn(t,e,dn.emptySet(e),o,n,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(t){if(!(this.fromCache===t.fromCache&&this.hasCachedResults===t.hasCachedResults&&this.syncStateChanged===t.syncStateChanged&&this.mutatedKeys.isEqual(t.mutatedKeys)&&bs(this.query,t.query)&&this.docs.isEqual(t.docs)&&this.oldDocs.isEqual(t.oldDocs)))return!1;const e=this.docChanges,n=t.docChanges;if(e.length!==n.length)return!1;for(let s=0;s<e.length;s++)if(e[s].type!==n[s].type||!e[s].doc.isEqual(n[s].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RI{constructor(){this.ya=void 0,this.wa=[]}Sa(){return this.wa.some(t=>t.ba())}}class SI{constructor(){this.queries=oh(),this.onlineState="Unknown",this.Da=new Set}terminate(){(function(e,n){const s=O(e),i=s.queries;s.queries=oh(),i.forEach((o,u)=>{for(const c of u.wa)c.onError(n)})})(this,new C(R.ABORTED,"Firestore shutting down"))}}function oh(){return new pe(r=>kd(r),bs)}async function mu(r,t){const e=O(r);let n=3;const s=t.query;let i=e.queries.get(s);i?!i.Sa()&&t.ba()&&(n=2):(i=new RI,n=t.ba()?0:1);try{switch(n){case 0:i.ya=await e.onListen(s,!0);break;case 1:i.ya=await e.onListen(s,!1);break;case 2:await e.onFirstRemoteStoreListen(s)}}catch(o){const u=Ir(o,`Initialization of query '${Ln(t.query)}' failed`);return void t.onError(u)}e.queries.set(s,i),i.wa.push(t),t.va(e.onlineState),i.ya&&t.Ca(i.ya)&&gu(e)}async function pu(r,t){const e=O(r),n=t.query;let s=3;const i=e.queries.get(n);if(i){const o=i.wa.indexOf(t);o>=0&&(i.wa.splice(o,1),i.wa.length===0?s=t.ba()?0:1:!i.Sa()&&t.ba()&&(s=2))}switch(s){case 0:return e.queries.delete(n),e.onUnlisten(n,!0);case 1:return e.queries.delete(n),e.onUnlisten(n,!1);case 2:return e.onLastRemoteStoreUnlisten(n);default:return}}function PI(r,t){const e=O(r);let n=!1;for(const s of t){const i=s.query,o=e.queries.get(i);if(o){for(const u of o.wa)u.Ca(s)&&(n=!0);o.ya=s}}n&&gu(e)}function VI(r,t,e){const n=O(r),s=n.queries.get(t);if(s)for(const i of s.wa)i.onError(e);n.queries.delete(t)}function gu(r){r.Da.forEach(t=>{t.next()})}var Sa,ah;(ah=Sa||(Sa={})).Fa="default",ah.Cache="cache";class _u{constructor(t,e,n){this.query=t,this.Ma=e,this.xa=!1,this.Oa=null,this.onlineState="Unknown",this.options=n||{}}Ca(t){if(!this.options.includeMetadataChanges){const n=[];for(const s of t.docChanges)s.type!==3&&n.push(s);t=new Tn(t.query,t.docs,t.oldDocs,n,t.mutatedKeys,t.fromCache,t.syncStateChanged,!0,t.hasCachedResults)}let e=!1;return this.xa?this.Na(t)&&(this.Ma.next(t),e=!0):this.Ba(t,this.onlineState)&&(this.La(t),e=!0),this.Oa=t,e}onError(t){this.Ma.error(t)}va(t){this.onlineState=t;let e=!1;return this.Oa&&!this.xa&&this.Ba(this.Oa,t)&&(this.La(this.Oa),e=!0),e}Ba(t,e){if(!t.fromCache||!this.ba())return!0;const n=e!=="Offline";return(!this.options.ka||!n)&&(!t.docs.isEmpty()||t.hasCachedResults||e==="Offline")}Na(t){if(t.docChanges.length>0)return!0;const e=this.Oa&&this.Oa.hasPendingWrites!==t.hasPendingWrites;return!(!t.syncStateChanged&&!e)&&this.options.includeMetadataChanges===!0}La(t){t=Tn.fromInitialDocuments(t.query,t.docs,t.mutatedKeys,t.fromCache,t.hasCachedResults),this.xa=!0,this.Ma.next(t)}ba(){return this.options.source!==Sa.Cache}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gf{constructor(t,e){this.qa=t,this.byteLength=e}Qa(){return"metadata"in this.qa}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uh{constructor(t){this.serializer=t}Qs(t){return se(this.serializer,t)}$s(t){return t.metadata.exists?Yi(this.serializer,t.document,!1):ut.newNoDocument(this.Qs(t.metadata.name),this.Us(t.metadata.readTime))}Us(t){return gt(t)}}class yu{constructor(t,e){this.$a=t,this.serializer=e,this.Ua=[],this.Ka=[],this.collectionGroups=new Set,this.progress=Kf(t)}get queries(){return this.Ua}get documents(){return this.Ka}Wa(t){this.progress.bytesLoaded+=t.byteLength;let e=this.progress.documentsLoaded;if(t.qa.namedQuery)this.Ua.push(t.qa.namedQuery);else if(t.qa.documentMetadata){this.Ka.push({metadata:t.qa.documentMetadata}),t.qa.documentMetadata.exists||++e;const n=Q.fromString(t.qa.documentMetadata.name);this.collectionGroups.add(n.get(n.length-2))}else t.qa.document&&(this.Ka[this.Ka.length-1].document=t.qa.document,++e);return e!==this.progress.documentsLoaded?(this.progress.documentsLoaded=e,Object.assign({},this.progress)):null}Ga(t){const e=new Map,n=new uh(this.serializer);for(const s of t)if(s.metadata.queries){const i=n.Qs(s.metadata.name);for(const o of s.metadata.queries){const u=(e.get(o)||$()).add(i);e.set(o,u)}}return e}async za(t){const e=await rI(t,new uh(this.serializer),this.Ka,this.$a.id),n=this.Ga(this.documents);for(const s of this.Ua)await sI(t,s,n.get(s.name));return this.progress.taskState="Success",{progress:this.progress,ja:this.collectionGroups,Ja:e}}}function Kf(r){return{taskState:"Running",documentsLoaded:0,bytesLoaded:0,totalDocuments:r.totalDocuments,totalBytes:r.totalBytes}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qf{constructor(t){this.key=t}}class Wf{constructor(t){this.key=t}}class Hf{constructor(t,e){this.query=t,this.Ha=e,this.Ya=null,this.hasCachedResults=!1,this.current=!1,this.Za=$(),this.mutatedKeys=$(),this.Xa=Fd(t),this.eu=new dn(this.Xa)}get tu(){return this.Ha}nu(t,e){const n=e?e.ru:new ih,s=e?e.eu:this.eu;let i=e?e.mutatedKeys:this.mutatedKeys,o=s,u=!1;const c=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,h=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(t.inorderTraversal((f,m)=>{const g=s.get(f),w=Rs(this.query,m)?m:null,V=!!g&&this.mutatedKeys.has(g.key),D=!!w&&(w.hasLocalMutations||this.mutatedKeys.has(w.key)&&w.hasCommittedMutations);let x=!1;g&&w?g.data.isEqual(w.data)?V!==D&&(n.track({type:3,doc:w}),x=!0):this.iu(g,w)||(n.track({type:2,doc:w}),x=!0,(c&&this.Xa(w,c)>0||h&&this.Xa(w,h)<0)&&(u=!0)):!g&&w?(n.track({type:0,doc:w}),x=!0):g&&!w&&(n.track({type:1,doc:g}),x=!0,(c||h)&&(u=!0)),x&&(w?(o=o.add(w),i=D?i.add(f):i.delete(f)):(o=o.delete(f),i=i.delete(f)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const f=this.query.limitType==="F"?o.last():o.first();o=o.delete(f.key),i=i.delete(f.key),n.track({type:1,doc:f})}return{eu:o,ru:n,Ds:u,mutatedKeys:i}}iu(t,e){return t.hasLocalMutations&&e.hasCommittedMutations&&!e.hasLocalMutations}applyChanges(t,e,n,s){const i=this.eu;this.eu=t.eu,this.mutatedKeys=t.mutatedKeys;const o=t.ru.pa();o.sort((f,m)=>function(w,V){const D=x=>{switch(x){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return M(20277,{At:x})}};return D(w)-D(V)}(f.type,m.type)||this.Xa(f.doc,m.doc)),this.su(n),s=s!=null&&s;const u=e&&!s?this.ou():[],c=this.Za.size===0&&this.current&&!s?1:0,h=c!==this.Ya;return this.Ya=c,o.length!==0||h?{snapshot:new Tn(this.query,t.eu,i,o,t.mutatedKeys,c===0,h,!1,!!n&&n.resumeToken.approximateByteSize()>0),_u:u}:{_u:u}}va(t){return this.current&&t==="Offline"?(this.current=!1,this.applyChanges({eu:this.eu,ru:new ih,mutatedKeys:this.mutatedKeys,Ds:!1},!1)):{_u:[]}}au(t){return!this.Ha.has(t)&&!!this.eu.has(t)&&!this.eu.get(t).hasLocalMutations}su(t){t&&(t.addedDocuments.forEach(e=>this.Ha=this.Ha.add(e)),t.modifiedDocuments.forEach(e=>{}),t.removedDocuments.forEach(e=>this.Ha=this.Ha.delete(e)),this.current=t.current)}ou(){if(!this.current)return[];const t=this.Za;this.Za=$(),this.eu.forEach(n=>{this.au(n.key)&&(this.Za=this.Za.add(n.key))});const e=[];return t.forEach(n=>{this.Za.has(n)||e.push(new Wf(n))}),this.Za.forEach(n=>{t.has(n)||e.push(new Qf(n))}),e}uu(t){this.Ha=t.qs,this.Za=$();const e=this.nu(t.documents);return this.applyChanges(e,!0)}cu(){return Tn.fromInitialDocuments(this.query,this.eu,this.mutatedKeys,this.Ya===0,this.hasCachedResults)}}const Ke="SyncEngine";class CI{constructor(t,e,n){this.query=t,this.targetId=e,this.view=n}}class DI{constructor(t){this.key=t,this.lu=!1}}class xI{constructor(t,e,n,s,i,o){this.localStore=t,this.remoteStore=e,this.eventManager=n,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.hu={},this.Pu=new pe(u=>kd(u),bs),this.Tu=new Map,this.Iu=new Set,this.du=new ot(k.comparator),this.Eu=new Map,this.Au=new nu,this.Ru={},this.Vu=new Map,this.mu=In.ur(),this.onlineState="Unknown",this.fu=void 0}get isPrimaryClient(){return this.fu===!0}}async function NI(r,t,e=!0){const n=io(r);let s;const i=n.Pu.get(t);return i?(n.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.cu()):s=await Xf(n,t,e,!0),s}async function kI(r,t){const e=io(r);await Xf(e,t,!0,!1)}async function Xf(r,t,e,n){const s=await sr(r.localStore,Ot(t)),i=s.targetId,o=r.sharedClientState.addLocalQueryTarget(i,e);let u;return n&&(u=await Iu(r,t,i,o==="current",s.resumeToken)),r.isPrimaryClient&&e&&so(r.remoteStore,s),u}async function Iu(r,t,e,n,s){r.gu=(m,g,w)=>async function(D,x,L,q){let B=x.view.nu(L);B.Ds&&(B=await ki(D.localStore,x.query,!1).then(({documents:E})=>x.view.nu(E,B)));const K=q&&q.targetChanges.get(x.targetId),tt=q&&q.targetMismatches.get(x.targetId)!=null,G=x.view.applyChanges(B,D.isPrimaryClient,K,tt);return Pa(D,x.targetId,G._u),G.snapshot}(r,m,g,w);const i=await ki(r.localStore,t,!0),o=new Hf(t,i.qs),u=o.nu(i.documents),c=Vs.createSynthesizedTargetChangeForCurrentChange(e,n&&r.onlineState!=="Offline",s),h=o.applyChanges(u,r.isPrimaryClient,c);Pa(r,e,h._u);const f=new CI(t,e,o);return r.Pu.set(t,f),r.Tu.has(e)?r.Tu.get(e).push(t):r.Tu.set(e,[t]),h.snapshot}async function OI(r,t,e){const n=O(r),s=n.Pu.get(t),i=n.Tu.get(s.targetId);if(i.length>1)return n.Tu.set(s.targetId,i.filter(o=>!bs(o,t))),void n.Pu.delete(t);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(s.targetId),n.sharedClientState.isActiveQueryTarget(s.targetId)||await ir(n.localStore,s.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(s.targetId),e&&or(n.remoteStore,s.targetId),ar(n,s.targetId)}).catch(je)):(ar(n,s.targetId),await ir(n.localStore,s.targetId,!0))}async function FI(r,t){const e=O(r),n=e.Pu.get(t),s=e.Tu.get(n.targetId);e.isPrimaryClient&&s.length===1&&(e.sharedClientState.removeLocalQueryTarget(n.targetId),or(e.remoteStore,n.targetId))}async function MI(r,t,e){const n=wu(r);try{const s=await function(o,u){const c=O(o),h=Z.now(),f=u.reduce((w,V)=>w.add(V.key),$());let m,g;return c.persistence.runTransaction("Locally write mutations","readwrite",w=>{let V=jt(),D=$();return c.Os.getEntries(w,f).next(x=>{V=x,V.forEach((L,q)=>{q.isValidDocument()||(D=D.add(L))})}).next(()=>c.localDocuments.getOverlayedDocuments(w,V)).next(x=>{m=x;const L=[];for(const q of u){const B=uy(q,m.get(q.key).overlayedDocument);B!=null&&L.push(new ge(q.key,B,wd(B.value.mapValue),ht.exists(!0)))}return c.mutationQueue.addMutationBatch(w,h,L,u)}).next(x=>{g=x;const L=x.applyToLocalDocumentSet(m,D);return c.documentOverlayCache.saveOverlays(w,x.batchId,L)})}).then(()=>({batchId:g.batchId,changes:Ld(m)}))}(n.localStore,t);n.sharedClientState.addPendingMutation(s.batchId),function(o,u,c){let h=o.Ru[o.currentUser.toKey()];h||(h=new ot(z)),h=h.insert(u,c),o.Ru[o.currentUser.toKey()]=h}(n,s.batchId,e),await _e(n,s.changes),await _r(n.remoteStore)}catch(s){const i=Ir(s,"Failed to persist write");e.reject(i)}}async function Jf(r,t){const e=O(r);try{const n=await eI(e.localStore,t);t.targetChanges.forEach((s,i)=>{const o=e.Eu.get(i);o&&(U(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.lu=!0:s.modifiedDocuments.size>0?U(o.lu,14607):s.removedDocuments.size>0&&(U(o.lu,42227),o.lu=!1))}),await _e(e,n,t)}catch(n){await je(n)}}function ch(r,t,e){const n=O(r);if(n.isPrimaryClient&&e===0||!n.isPrimaryClient&&e===1){const s=[];n.Pu.forEach((i,o)=>{const u=o.view.va(t);u.snapshot&&s.push(u.snapshot)}),function(o,u){const c=O(o);c.onlineState=u;let h=!1;c.queries.forEach((f,m)=>{for(const g of m.wa)g.va(u)&&(h=!0)}),h&&gu(c)}(n.eventManager,t),s.length&&n.hu.J_(s),n.onlineState=t,n.isPrimaryClient&&n.sharedClientState.setOnlineState(t)}}async function LI(r,t,e){const n=O(r);n.sharedClientState.updateQueryState(t,"rejected",e);const s=n.Eu.get(t),i=s&&s.key;if(i){let o=new ot(k.comparator);o=o.insert(i,ut.newNoDocument(i,j.min()));const u=$().add(i),c=new Ps(j.min(),new Map,new ot(z),o,u);await Jf(n,c),n.du=n.du.remove(i),n.Eu.delete(t),vu(n)}else await ir(n.localStore,t,!1).then(()=>ar(n,t,e)).catch(je)}async function BI(r,t){const e=O(r),n=t.batch.batchId;try{const s=await tI(e.localStore,t);Tu(e,n,null),Eu(e,n),e.sharedClientState.updateMutationState(n,"acknowledged"),await _e(e,s)}catch(s){await je(s)}}async function UI(r,t,e){const n=O(r);try{const s=await function(o,u){const c=O(o);return c.persistence.runTransaction("Reject batch","readwrite-primary",h=>{let f;return c.mutationQueue.lookupMutationBatch(h,u).next(m=>(U(m!==null,37113),f=m.keys(),c.mutationQueue.removeMutationBatch(h,m))).next(()=>c.mutationQueue.performConsistencyCheck(h)).next(()=>c.documentOverlayCache.removeOverlaysForBatchId(h,f,u)).next(()=>c.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(h,f)).next(()=>c.localDocuments.getDocuments(h,f))})}(n.localStore,t);Tu(n,t,e),Eu(n,t),n.sharedClientState.updateMutationState(t,"rejected",e),await _e(n,s)}catch(s){await je(s)}}async function qI(r,t){const e=O(r);Ge(e.remoteStore)||N(Ke,"The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");try{const n=await function(o){const u=O(o);return u.persistence.runTransaction("Get highest unacknowledged batch id","readonly",c=>u.mutationQueue.getHighestUnacknowledgedBatchId(c))}(e.localStore);if(n===xe)return void t.resolve();const s=e.Vu.get(n)||[];s.push(t),e.Vu.set(n,s)}catch(n){const s=Ir(n,"Initialization of waitForPendingWrites() operation failed");t.reject(s)}}function Eu(r,t){(r.Vu.get(t)||[]).forEach(e=>{e.resolve()}),r.Vu.delete(t)}function Tu(r,t,e){const n=O(r);let s=n.Ru[n.currentUser.toKey()];if(s){const i=s.get(t);i&&(e?i.reject(e):i.resolve(),s=s.remove(t)),n.Ru[n.currentUser.toKey()]=s}}function ar(r,t,e=null){r.sharedClientState.removeLocalQueryTarget(t);for(const n of r.Tu.get(t))r.Pu.delete(n),e&&r.hu.pu(n,e);r.Tu.delete(t),r.isPrimaryClient&&r.Au.zr(t).forEach(n=>{r.Au.containsKey(n)||Yf(r,n)})}function Yf(r,t){r.Iu.delete(t.path.canonicalString());const e=r.du.get(t);e!==null&&(or(r.remoteStore,e),r.du=r.du.remove(t),r.Eu.delete(e),vu(r))}function Pa(r,t,e){for(const n of e)n instanceof Qf?(r.Au.addReference(n.key,t),jI(r,n)):n instanceof Wf?(N(Ke,"Document no longer in limbo: "+n.key),r.Au.removeReference(n.key,t),r.Au.containsKey(n.key)||Yf(r,n.key)):M(19791,{yu:n})}function jI(r,t){const e=t.key,n=e.path.canonicalString();r.du.get(e)||r.Iu.has(n)||(N(Ke,"New document in limbo: "+e),r.Iu.add(n),vu(r))}function vu(r){for(;r.Iu.size>0&&r.du.size<r.maxConcurrentLimboResolutions;){const t=r.Iu.values().next().value;r.Iu.delete(t);const e=new k(Q.fromString(t)),n=r.mu.next();r.Eu.set(n,new DI(e)),r.du=r.du.insert(e,n),so(r.remoteStore,new ce(Ot(fr(e.path)),n,"TargetPurposeLimboResolution",Ut.ue))}}async function _e(r,t,e){const n=O(r),s=[],i=[],o=[];n.Pu.isEmpty()||(n.Pu.forEach((u,c)=>{o.push(n.gu(c,t,e).then(h=>{var f;if((h||e)&&n.isPrimaryClient){const m=h?!h.fromCache:(f=e?.targetChanges.get(c.targetId))===null||f===void 0?void 0:f.current;n.sharedClientState.updateQueryState(c.targetId,m?"current":"not-current")}if(h){s.push(h);const m=ou.Es(c.targetId,h);i.push(m)}}))}),await Promise.all(o),n.hu.J_(s),await async function(c,h){const f=O(c);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",m=>A.forEach(h,g=>A.forEach(g.Is,w=>f.persistence.referenceDelegate.addReference(m,g.targetId,w)).next(()=>A.forEach(g.ds,w=>f.persistence.referenceDelegate.removeReference(m,g.targetId,w)))))}catch(m){if(!ze(m))throw m;N(au,"Failed to update sequence numbers: "+m)}for(const m of h){const g=m.targetId;if(!m.fromCache){const w=f.Fs.get(g),V=w.snapshotVersion,D=w.withLastLimboFreeSnapshotVersion(V);f.Fs=f.Fs.insert(g,D)}}}(n.localStore,i))}async function zI(r,t){const e=O(r);if(!e.currentUser.isEqual(t)){N(Ke,"User change. New user:",t.toKey());const n=await Pf(e.localStore,t);e.currentUser=t,function(i,o){i.Vu.forEach(u=>{u.forEach(c=>{c.reject(new C(R.CANCELLED,o))})}),i.Vu.clear()}(e,"'waitForPendingWrites' promise is rejected due to a user change."),e.sharedClientState.handleUserChange(t,n.removedBatchIds,n.addedBatchIds),await _e(e,n.Bs)}}function $I(r,t){const e=O(r),n=e.Eu.get(t);if(n&&n.lu)return $().add(n.key);{let s=$();const i=e.Tu.get(t);if(!i)return s;for(const o of i){const u=e.Pu.get(o);s=s.unionWith(u.view.tu)}return s}}async function GI(r,t){const e=O(r),n=await ki(e.localStore,t.query,!0),s=t.view.uu(n);return e.isPrimaryClient&&Pa(e,t.targetId,s._u),s}async function KI(r,t){const e=O(r);return xf(e.localStore,t).then(n=>_e(e,n))}async function QI(r,t,e,n){const s=O(r),i=await function(u,c){const h=O(u),f=O(h.mutationQueue);return h.persistence.runTransaction("Lookup mutation documents","readonly",m=>f.Xn(m,c).next(g=>g?h.localDocuments.getDocuments(m,g):A.resolve(null)))}(s.localStore,t);i!==null?(e==="pending"?await _r(s.remoteStore):e==="acknowledged"||e==="rejected"?(Tu(s,t,n||null),Eu(s,t),function(u,c){O(O(u).mutationQueue).rr(c)}(s.localStore,t)):M(6720,"Unknown batchState",{wu:e}),await _e(s,i)):N(Ke,"Cannot apply mutation batch with id: "+t)}async function WI(r,t){const e=O(r);if(io(e),wu(e),t===!0&&e.fu!==!0){const n=e.sharedClientState.getAllActiveQueryTargets(),s=await lh(e,n.toArray());e.fu=!0,await Ra(e.remoteStore,!0);for(const i of s)so(e.remoteStore,i)}else if(t===!1&&e.fu!==!1){const n=[];let s=Promise.resolve();e.Tu.forEach((i,o)=>{e.sharedClientState.isLocalQueryTarget(o)?n.push(o):s=s.then(()=>(ar(e,o),ir(e.localStore,o,!0))),or(e.remoteStore,o)}),await s,await lh(e,n),function(o){const u=O(o);u.Eu.forEach((c,h)=>{or(u.remoteStore,h)}),u.Au.jr(),u.Eu=new Map,u.du=new ot(k.comparator)}(e),e.fu=!1,await Ra(e.remoteStore,!1)}}async function lh(r,t,e){const n=O(r),s=[],i=[];for(const o of t){let u;const c=n.Tu.get(o);if(c&&c.length!==0){u=await sr(n.localStore,Ot(c[0]));for(const h of c){const f=n.Pu.get(h),m=await GI(n,f);m.snapshot&&i.push(m.snapshot)}}else{const h=await Df(n.localStore,o);u=await sr(n.localStore,h),await Iu(n,Zf(h),o,!1,u.resumeToken)}s.push(u)}return n.hu.J_(i),s}function Zf(r){return Dd(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function HI(r){return function(e){return O(O(e).persistence).Ps()}(O(r).localStore)}async function XI(r,t,e,n){const s=O(r);if(s.fu)return void N(Ke,"Ignoring unexpected query state notification.");const i=s.Tu.get(t);if(i&&i.length>0)switch(e){case"current":case"not-current":{const o=await xf(s.localStore,Od(i[0])),u=Ps.createSynthesizedRemoteEventForCurrentChange(t,e==="current",ft.EMPTY_BYTE_STRING);await _e(s,o,u);break}case"rejected":await ir(s.localStore,t,!0),ar(s,t,n);break;default:M(64155,e)}}async function JI(r,t,e){const n=io(r);if(n.fu){for(const s of t){if(n.Tu.has(s)&&n.sharedClientState.isActiveQueryTarget(s)){N(Ke,"Adding an already active target "+s);continue}const i=await Df(n.localStore,s),o=await sr(n.localStore,i);await Iu(n,Zf(i),o.targetId,!1,o.resumeToken),so(n.remoteStore,o)}for(const s of e)n.Tu.has(s)&&await ir(n.localStore,s,!1).then(()=>{or(n.remoteStore,s),ar(n,s)}).catch(je)}}function io(r){const t=O(r);return t.remoteStore.remoteSyncer.applyRemoteEvent=Jf.bind(null,t),t.remoteStore.remoteSyncer.getRemoteKeysForTarget=$I.bind(null,t),t.remoteStore.remoteSyncer.rejectListen=LI.bind(null,t),t.hu.J_=PI.bind(null,t.eventManager),t.hu.pu=VI.bind(null,t.eventManager),t}function wu(r){const t=O(r);return t.remoteStore.remoteSyncer.applySuccessfulWrite=BI.bind(null,t),t.remoteStore.remoteSyncer.rejectFailedWrite=UI.bind(null,t),t}function YI(r,t,e){const n=O(r);(async function(i,o,u){try{const c=await o.getMetadata();if(await function(w,V){const D=O(w),x=gt(V.createTime);return D.persistence.runTransaction("hasNewerBundle","readonly",L=>D.Ti.getBundleMetadata(L,V.id)).then(L=>!!L&&L.createTime.compareTo(x)>=0)}(i.localStore,c))return await o.close(),u._completeWith(function(w){return{taskState:"Success",documentsLoaded:w.totalDocuments,bytesLoaded:w.totalBytes,totalDocuments:w.totalDocuments,totalBytes:w.totalBytes}}(c)),Promise.resolve(new Set);u._updateProgress(Kf(c));const h=new yu(c,o.serializer);let f=await o.Su();for(;f;){const g=await h.Wa(f);g&&u._updateProgress(g),f=await o.Su()}const m=await h.za(i.localStore);return await _e(i,m.Ja,void 0),await function(w,V){const D=O(w);return D.persistence.runTransaction("Save bundle","readwrite",x=>D.Ti.saveBundleMetadata(x,V))}(i.localStore,c),u._completeWith(m.progress),Promise.resolve(m.ja)}catch(c){return Ft(Ke,`Loading bundle failed with ${c}`),u._failWith(c),Promise.resolve(new Set)}})(n,t,e).then(s=>{n.sharedClientState.notifyBundleLoaded(s)})}class ur{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(t){this.serializer=wn(t.databaseInfo.databaseId),this.sharedClientState=this.bu(t),this.persistence=this.Du(t),await this.persistence.start(),this.localStore=this.vu(t),this.gcScheduler=this.Cu(t,this.localStore),this.indexBackfillerScheduler=this.Fu(t,this.localStore)}Cu(t,e){return null}Fu(t,e){return null}vu(t){return Sf(this.persistence,new Rf,t.initialUser,this.serializer)}Du(t){return new ru(ro.Vi,this.serializer)}bu(t){return new Mf}async terminate(){var t,e;(t=this.gcScheduler)===null||t===void 0||t.stop(),(e=this.indexBackfillerScheduler)===null||e===void 0||e.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}ur.provider={build:()=>new ur};class Au extends ur{constructor(t){super(),this.cacheSizeBytes=t}Cu(t,e){U(this.persistence.referenceDelegate instanceof Ni,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new Ef(n,t.asyncQueue,e)}Du(t){const e=this.cacheSizeBytes!==void 0?Nt.withCacheSize(this.cacheSizeBytes):Nt.DEFAULT;return new ru(n=>Ni.Vi(n,e),this.serializer)}}class bu extends ur{constructor(t,e,n){super(),this.Mu=t,this.cacheSizeBytes=e,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(t){await super.initialize(t),await this.Mu.initialize(this,t),await wu(this.Mu.syncEngine),await _r(this.Mu.remoteStore),await this.persistence.ji(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}vu(t){return Sf(this.persistence,new Rf,t.initialUser,this.serializer)}Cu(t,e){const n=this.persistence.referenceDelegate.garbageCollector;return new Ef(n,t.asyncQueue,e)}Fu(t,e){const n=new d_(e,this.persistence);return new h_(t.asyncQueue,n)}Du(t){const e=iu(t.databaseInfo.databaseId,t.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?Nt.withCacheSize(this.cacheSizeBytes):Nt.DEFAULT;return new su(this.synchronizeTabs,e,t.clientId,n,t.asyncQueue,Lf(),yi(),this.serializer,this.sharedClientState,!!this.forceOwnership)}bu(t){return new Mf}}class tm extends bu{constructor(t,e){super(t,e,!1),this.Mu=t,this.cacheSizeBytes=e,this.synchronizeTabs=!0}async initialize(t){await super.initialize(t);const e=this.Mu.syncEngine;this.sharedClientState instanceof Ho&&(this.sharedClientState.syncEngine={Do:QI.bind(null,e),vo:XI.bind(null,e),Co:JI.bind(null,e),Ps:HI.bind(null,e),bo:KI.bind(null,e)},await this.sharedClientState.start()),await this.persistence.ji(async n=>{await WI(this.Mu.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}bu(t){const e=Lf();if(!Ho.C(e))throw new C(R.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=iu(t.databaseInfo.databaseId,t.databaseInfo.persistenceKey);return new Ho(e,t.asyncQueue,n,t.clientId,t.initialUser)}}class Ue{async initialize(t,e){this.localStore||(this.localStore=t.localStore,this.sharedClientState=t.sharedClientState,this.datastore=this.createDatastore(e),this.remoteStore=this.createRemoteStore(e),this.eventManager=this.createEventManager(e),this.syncEngine=this.createSyncEngine(e,!t.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>ch(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=zI.bind(null,this.syncEngine),await Ra(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(t){return function(){return new SI}()}createDatastore(t){const e=wn(t.databaseInfo.databaseId),n=function(i){return new cI(i)}(t.databaseInfo);return function(i,o,u,c){return new fI(i,o,u,c)}(t.authCredentials,t.appCheckCredentials,n,e)}createRemoteStore(t){return function(n,s,i,o,u){return new pI(n,s,i,o,u)}(this.localStore,this.datastore,t.asyncQueue,e=>ch(this.syncEngine,e,0),function(){return nh.C()?new nh:new iI}())}createSyncEngine(t,e){return function(s,i,o,u,c,h,f){const m=new xI(s,i,o,u,c,h);return f&&(m.fu=!0),m}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,t.initialUser,t.maxConcurrentLimboResolutions,e)}async terminate(){var t,e;await async function(s){const i=O(s);N(En,"RemoteStore shutting down."),i.Ia.add(5),await gr(i),i.Ea.shutdown(),i.Aa.set("Unknown")}(this.remoteStore),(t=this.datastore)===null||t===void 0||t.terminate(),(e=this.eventManager)===null||e===void 0||e.terminate()}}Ue.provider={build:()=>new Ue};function hh(r,t=10240){let e=0;return{async read(){if(e<r.byteLength){const n={value:r.slice(e,e+t),done:!1};return e+=t,n}return{done:!0}},async cancel(){},releaseLock(){},closed:Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oo{constructor(t){this.observer=t,this.muted=!1}next(t){this.muted||this.observer.next&&this.xu(this.observer.next,t)}error(t){this.muted||(this.observer.error?this.xu(this.observer.error,t):pt("Uncaught Error in snapshot listener:",t.toString()))}Ou(){this.muted=!0}xu(t,e){setTimeout(()=>{this.muted||t(e)},0)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ZI{constructor(t,e){this.Nu=t,this.serializer=e,this.metadata=new At,this.buffer=new Uint8Array,this.Bu=function(){return new TextDecoder("utf-8")}(),this.Lu().then(n=>{n&&n.Qa()?this.metadata.resolve(n.qa.metadata):this.metadata.reject(new Error(`The first element of the bundle is not a metadata, it is
             ${JSON.stringify(n?.qa)}`))},n=>this.metadata.reject(n))}close(){return this.Nu.cancel()}async getMetadata(){return this.metadata.promise}async Su(){return await this.getMetadata(),this.Lu()}async Lu(){const t=await this.ku();if(t===null)return null;const e=this.Bu.decode(t),n=Number(e);isNaN(n)&&this.qu(`length string (${e}) is not valid number`);const s=await this.Qu(n);return new Gf(JSON.parse(s),t.length+n)}$u(){return this.buffer.findIndex(t=>t===123)}async ku(){for(;this.$u()<0&&!await this.Uu(););if(this.buffer.length===0)return null;const t=this.$u();t<0&&this.qu("Reached the end of bundle when a length string is expected.");const e=this.buffer.slice(0,t);return this.buffer=this.buffer.slice(t),e}async Qu(t){for(;this.buffer.length<t;)await this.Uu()&&this.qu("Reached the end of bundle when more is expected.");const e=this.Bu.decode(this.buffer.slice(0,t));return this.buffer=this.buffer.slice(t),e}qu(t){throw this.Nu.cancel(),new Error(`Invalid bundle format: ${t}`)}async Uu(){const t=await this.Nu.read();if(!t.done){const e=new Uint8Array(this.buffer.length+t.value.length);e.set(this.buffer),e.set(t.value,this.buffer.length),this.buffer=e}return t.done}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tE{constructor(t,e){this.bundleData=t,this.serializer=e,this.cursor=0,this.elements=[];let n=this.Su();if(!n||!n.Qa())throw new Error(`The first element of the bundle is not a metadata object, it is
         ${JSON.stringify(n?.qa)}`);this.metadata=n;do n=this.Su(),n!==null&&this.elements.push(n);while(n!==null)}getMetadata(){return this.metadata}Ku(){return this.elements}Su(){if(this.cursor===this.bundleData.length)return null;const t=this.ku(),e=this.Qu(t);return new Gf(JSON.parse(e),t)}Qu(t){if(this.cursor+t>this.bundleData.length)throw new C(R.INTERNAL,"Reached the end of bundle when more is expected.");return this.bundleData.slice(this.cursor,this.cursor+=t)}ku(){const t=this.cursor;let e=this.cursor;for(;e<this.bundleData.length;){if(this.bundleData[e]==="{"){if(e===t)throw new Error("First character is a bracket and not a number");return this.cursor=e,Number(this.bundleData.slice(t,e))}e++}throw new Error("Reached the end of bundle when more is expected.")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eE{constructor(t){this.datastore=t,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(t){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new C(R.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const e=await async function(s,i){const o=O(s),u={documents:i.map(m=>ys(o.serializer,m))},c=await o.Jo("BatchGetDocuments",o.serializer.databaseId,Q.emptyPath(),u,i.length),h=new Map;c.forEach(m=>{const g=_y(o.serializer,m);h.set(g.key.toString(),g)});const f=[];return i.forEach(m=>{const g=h.get(m.toString());U(!!g,55234,{key:m}),f.push(g)}),f}(this.datastore,t);return e.forEach(n=>this.recordVersion(n)),e}set(t,e){this.write(e.toMutation(t,this.precondition(t))),this.writtenDocs.add(t.toString())}update(t,e){try{this.write(e.toMutation(t,this.preconditionForUpdate(t)))}catch(n){this.lastTransactionError=n}this.writtenDocs.add(t.toString())}delete(t){this.write(new pr(t,this.precondition(t))),this.writtenDocs.add(t.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const t=this.readVersions;this.mutations.forEach(e=>{t.delete(e.key.toString())}),t.forEach((e,n)=>{const s=k.fromPath(n);this.mutations.push(new Wa(s,this.precondition(s)))}),await async function(n,s){const i=O(n),o={writes:s.map(u=>Is(i.serializer,u))};await i.Wo("Commit",i.serializer.databaseId,Q.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(t){let e;if(t.isFoundDocument())e=t.version;else{if(!t.isNoDocument())throw M(50498,{Wu:t.constructor.name});e=j.min()}const n=this.readVersions.get(t.key.toString());if(n){if(!e.isEqual(n))throw new C(R.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(t.key.toString(),e)}precondition(t){const e=this.readVersions.get(t.toString());return!this.writtenDocs.has(t.toString())&&e?e.isEqual(j.min())?ht.exists(!1):ht.updateTime(e):ht.none()}preconditionForUpdate(t){const e=this.readVersions.get(t.toString());if(!this.writtenDocs.has(t.toString())&&e){if(e.isEqual(j.min()))throw new C(R.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return ht.updateTime(e)}return ht.exists(!0)}write(t){this.ensureCommitNotCalled(),this.mutations.push(t)}ensureCommitNotCalled(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nE{constructor(t,e,n,s,i){this.asyncQueue=t,this.datastore=e,this.options=n,this.updateFunction=s,this.deferred=i,this.Gu=n.maxAttempts,this.F_=new cu(this.asyncQueue,"transaction_retry")}zu(){this.Gu-=1,this.ju()}ju(){this.F_.g_(async()=>{const t=new eE(this.datastore),e=this.Ju(t);e&&e.then(n=>{this.asyncQueue.enqueueAndForget(()=>t.commit().then(()=>{this.deferred.resolve(n)}).catch(s=>{this.Hu(s)}))}).catch(n=>{this.Hu(n)})})}Ju(t){try{const e=this.updateFunction(t);return!vs(e)&&e.catch&&e.then?e:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(e){return this.deferred.reject(e),null}}Hu(t){this.Gu>0&&this.Yu(t)?(this.Gu-=1,this.asyncQueue.enqueueAndForget(()=>(this.ju(),Promise.resolve()))):this.deferred.reject(t)}Yu(t){if(t.name==="FirebaseError"){const e=t.code;return e==="aborted"||e==="failed-precondition"||e==="already-exists"||!Hd(e)}return!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qe="FirestoreClient";class rE{constructor(t,e,n,s,i){this.authCredentials=t,this.appCheckCredentials=e,this.asyncQueue=n,this.databaseInfo=s,this.user=wt.UNAUTHENTICATED,this.clientId=qi.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(n,async o=>{N(qe,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(n,o=>(N(qe,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(t){this.authCredentialListener=t}setAppCheckTokenChangeListener(t){this.appCheckCredentialListener=t}terminate(){this.asyncQueue.enterRestrictedMode();const t=new At;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),t.resolve()}catch(e){const n=Ir(e,"Failed to shutdown persistence");t.reject(n)}}),t.promise}}async function Jo(r,t){r.asyncQueue.verifyOperationInProgress(),N(qe,"Initializing OfflineComponentProvider");const e=r.configuration;await t.initialize(e);let n=e.initialUser;r.setCredentialChangeListener(async s=>{n.isEqual(s)||(await Pf(t.localStore,s),n=s)}),t.persistence.setDatabaseDeletedListener(()=>{Ft("Terminating Firestore due to IndexedDb database deletion"),r.terminate().then(()=>{N("Terminating Firestore due to IndexedDb database deletion completed successfully")}).catch(s=>{Ft("Terminating Firestore due to IndexedDb database deletion failed",s)})}),r._offlineComponents=t}async function dh(r,t){r.asyncQueue.verifyOperationInProgress();const e=await Ru(r);N(qe,"Initializing OnlineComponentProvider"),await t.initialize(e,r.configuration),r.setCredentialChangeListener(n=>sh(t.remoteStore,n)),r.setAppCheckTokenChangeListener((n,s)=>sh(t.remoteStore,s)),r._onlineComponents=t}async function Ru(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){N(qe,"Using user provided OfflineComponentProvider");try{await Jo(r,r._uninitializedComponentsProvider._offline)}catch(t){const e=t;if(!function(s){return s.name==="FirebaseError"?s.code===R.FAILED_PRECONDITION||s.code===R.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11}(e))throw e;Ft("Error using user provided cache. Falling back to memory cache: "+e),await Jo(r,new ur)}}else N(qe,"Using default OfflineComponentProvider"),await Jo(r,new Au(void 0));return r._offlineComponents}async function ao(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(N(qe,"Using user provided OnlineComponentProvider"),await dh(r,r._uninitializedComponentsProvider._online)):(N(qe,"Using default OnlineComponentProvider"),await dh(r,new Ue))),r._onlineComponents}function em(r){return Ru(r).then(t=>t.persistence)}function Er(r){return Ru(r).then(t=>t.localStore)}function nm(r){return ao(r).then(t=>t.remoteStore)}function Su(r){return ao(r).then(t=>t.syncEngine)}function rm(r){return ao(r).then(t=>t.datastore)}async function cr(r){const t=await ao(r),e=t.eventManager;return e.onListen=NI.bind(null,t.syncEngine),e.onUnlisten=OI.bind(null,t.syncEngine),e.onFirstRemoteStoreListen=kI.bind(null,t.syncEngine),e.onLastRemoteStoreUnlisten=FI.bind(null,t.syncEngine),e}function sE(r){return r.asyncQueue.enqueue(async()=>{const t=await em(r),e=await nm(r);return t.setNetworkEnabled(!0),function(s){const i=O(s);return i.Ia.delete(0),Cs(i)}(e)})}function iE(r){return r.asyncQueue.enqueue(async()=>{const t=await em(r),e=await nm(r);return t.setNetworkEnabled(!1),async function(s){const i=O(s);i.Ia.add(0),await gr(i),i.Aa.set("Offline")}(e)})}function oE(r,t){const e=new At;return r.asyncQueue.enqueueAndForget(async()=>async function(s,i,o){try{const u=await function(h,f){const m=O(h);return m.persistence.runTransaction("read document","readonly",g=>m.localDocuments.getDocument(g,f))}(s,i);u.isFoundDocument()?o.resolve(u):u.isNoDocument()?o.resolve(null):o.reject(new C(R.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"))}catch(u){const c=Ir(u,`Failed to get document '${i} from cache`);o.reject(c)}}(await Er(r),t,e)),e.promise}function sm(r,t,e={}){const n=new At;return r.asyncQueue.enqueueAndForget(async()=>function(i,o,u,c,h){const f=new oo({next:g=>{f.Ou(),o.enqueueAndForget(()=>pu(i,m));const w=g.docs.has(u);!w&&g.fromCache?h.reject(new C(R.UNAVAILABLE,"Failed to get document because the client is offline.")):w&&g.fromCache&&c&&c.source==="server"?h.reject(new C(R.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):h.resolve(g)},error:g=>h.reject(g)}),m=new _u(fr(u.path),f,{includeMetadataChanges:!0,ka:!0});return mu(i,m)}(await cr(r),r.asyncQueue,t,e,n)),n.promise}function aE(r,t){const e=new At;return r.asyncQueue.enqueueAndForget(async()=>async function(s,i,o){try{const u=await ki(s,i,!0),c=new Hf(i,u.qs),h=c.nu(u.documents),f=c.applyChanges(h,!1);o.resolve(f.snapshot)}catch(u){const c=Ir(u,`Failed to execute query '${i} against cache`);o.reject(c)}}(await Er(r),t,e)),e.promise}function im(r,t,e={}){const n=new At;return r.asyncQueue.enqueueAndForget(async()=>function(i,o,u,c,h){const f=new oo({next:g=>{f.Ou(),o.enqueueAndForget(()=>pu(i,m)),g.fromCache&&c.source==="server"?h.reject(new C(R.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):h.resolve(g)},error:g=>h.reject(g)}),m=new _u(u,f,{includeMetadataChanges:!0,ka:!0});return mu(i,m)}(await cr(r),r.asyncQueue,t,e,n)),n.promise}function uE(r,t,e){const n=new At;return r.asyncQueue.enqueueAndForget(async()=>{try{const s=await rm(r);n.resolve(async function(o,u,c){var h;const f=O(o),{request:m,ft:g,parent:w}=of(f.serializer,xd(u),c);f.connection.Qo||delete m.parent;const V=(await f.Jo("RunAggregationQuery",f.serializer.databaseId,w,m,1)).filter(x=>!!x.result);U(V.length===1,64727);const D=(h=V[0].result)===null||h===void 0?void 0:h.aggregateFields;return Object.keys(D).reduce((x,L)=>(x[g[L]]=D[L],x),{})}(s,t,e))}catch(s){n.reject(s)}}),n.promise}function cE(r,t){const e=new oo(t);return r.asyncQueue.enqueueAndForget(async()=>function(s,i){O(s).Da.add(i),i.next()}(await cr(r),e)),()=>{e.Ou(),r.asyncQueue.enqueueAndForget(async()=>function(s,i){O(s).Da.delete(i)}(await cr(r),e))}}function lE(r,t,e,n){const s=function(o,u){let c;return c=typeof o=="string"?ka().encode(o):o,function(f,m){return new ZI(f,m)}(function(f,m){if(f instanceof Uint8Array)return hh(f,m);if(f instanceof ArrayBuffer)return hh(new Uint8Array(f),m);if(f instanceof ReadableStream)return f.getReader();throw new Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream")}(c),u)}(e,wn(t));r.asyncQueue.enqueueAndForget(async()=>{YI(await Su(r),s,n)})}function hE(r,t){return r.asyncQueue.enqueue(async()=>function(n,s){const i=O(n);return i.persistence.runTransaction("Get named query","readonly",o=>i.Ti.getNamedQuery(o,s))}(await Er(r),t))}function om(r,t){return function(n,s){return new tE(n,s)}(r,t)}function dE(r,t){return r.asyncQueue.enqueue(async()=>async function(n,s){const i=O(n),o=i.indexManager,u=[];return i.persistence.runTransaction("Configure indexes","readwrite",c=>o.getFieldIndexes(c).next(h=>function(m,g,w,V,D){m=[...m],g=[...g],m.sort(w),g.sort(w);const x=m.length,L=g.length;let q=0,B=0;for(;q<L&&B<x;){const K=w(m[B],g[q]);K<0?D(m[B++]):K>0?V(g[q++]):(q++,B++)}for(;q<L;)V(g[q++]);for(;B<x;)D(m[B++])}(h,s,a_,f=>{u.push(o.addFieldIndex(c,f))},f=>{u.push(o.deleteFieldIndex(c,f))})).next(()=>A.waitFor(u)))}(await Er(r),t))}function fE(r,t){return r.asyncQueue.enqueue(async()=>function(n,s){O(n).Cs.Rs=s}(await Er(r),t))}function mE(r){return r.asyncQueue.enqueue(async()=>function(e){const n=O(e),s=n.indexManager;return n.persistence.runTransaction("Delete All Indexes","readwrite",i=>s.deleteAllFieldIndexes(i))}(await Er(r)))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function am(r){const t={};return r.timeoutSeconds!==void 0&&(t.timeoutSeconds=r.timeoutSeconds),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fh=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const um="firestore.googleapis.com",mh=!0;class ph{constructor(t){var e,n;if(t.host===void 0){if(t.ssl!==void 0)throw new C(R.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=um,this.ssl=mh}else this.host=t.host,this.ssl=(e=t.ssl)!==null&&e!==void 0?e:mh;if(this.isUsingEmulator=t.emulatorOptions!==void 0,this.credentials=t.credentials,this.ignoreUndefinedProperties=!!t.ignoreUndefinedProperties,this.localCache=t.localCache,t.cacheSizeBytes===void 0)this.cacheSizeBytes=pf;else{if(t.cacheSizeBytes!==-1&&t.cacheSizeBytes<If)throw new C(R.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=t.cacheSizeBytes}Wh("experimentalForceLongPolling",t.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",t.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!t.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:t.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!t.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=am((n=t.experimentalLongPollingOptions)!==null&&n!==void 0?n:{}),function(i){if(i.timeoutSeconds!==void 0){if(isNaN(i.timeoutSeconds))throw new C(R.INVALID_ARGUMENT,`invalid long polling timeout: ${i.timeoutSeconds} (must not be NaN)`);if(i.timeoutSeconds<5)throw new C(R.INVALID_ARGUMENT,`invalid long polling timeout: ${i.timeoutSeconds} (minimum allowed value is 5)`);if(i.timeoutSeconds>30)throw new C(R.INVALID_ARGUMENT,`invalid long polling timeout: ${i.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!t.useFetchStreams}isEqual(t){return this.host===t.host&&this.ssl===t.ssl&&this.credentials===t.credentials&&this.cacheSizeBytes===t.cacheSizeBytes&&this.experimentalForceLongPolling===t.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===t.experimentalAutoDetectLongPolling&&function(n,s){return n.timeoutSeconds===s.timeoutSeconds}(this.experimentalLongPollingOptions,t.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===t.ignoreUndefinedProperties&&this.useFetchStreams===t.useFetchStreams}}class Ds{constructor(t,e,n,s){this._authCredentials=t,this._appCheckCredentials=e,this._databaseId=n,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new ph({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new C(R.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(t){if(this._settingsFrozen)throw new C(R.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new ph(t),this._emulatorOptions=t.emulatorOptions||{},t.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new Kh;switch(n.type){case"firstParty":return new e_(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new C(R.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(t.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(e){const n=fh.get(e);n&&(N("ComponentProvider","Removing Datastore"),fh.delete(e),n.terminate())}(this),Promise.resolve()}}function cm(r,t,e,n={}){var s;r=W(r,Ds);const i=Ui(t),o=r._getSettings(),u=Object.assign(Object.assign({},o),{emulatorOptions:r._getEmulatorOptions()}),c=`${t}:${e}`;i&&(Sh(`https://${c}`),Cp("Firestore",!0)),o.host!==um&&o.host!==c&&Ft("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const h=Object.assign(Object.assign({},o),{host:c,ssl:i,emulatorOptions:n});if(!Ne(h,u)&&(r._setSettings(h),n.mockUserToken)){let f,m;if(typeof n.mockUserToken=="string")f=n.mockUserToken,m=wt.MOCK_USER;else{f=Sp(n.mockUserToken,(s=r._app)===null||s===void 0?void 0:s.options.projectId);const g=n.mockUserToken.sub||n.mockUserToken.user_id;if(!g)throw new C(R.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");m=new wt(g)}r._authCredentials=new Yg(new Gh(f,m))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Et{constructor(t,e,n){this.converter=e,this._query=n,this.type="query",this.firestore=t}withConverter(t){return new Et(this.firestore,t,this._query)}}class nt{constructor(t,e,n){this.converter=e,this._key=n,this.type="document",this.firestore=t}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Jt(this.firestore,this.converter,this._key.path.popLast())}withConverter(t){return new nt(this.firestore,t,this._key)}toJSON(){return{type:nt._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(t,e,n){if(vn(e,nt._jsonSchema))return new nt(t,n||null,new k(Q.fromString(e.referencePath)))}}nt._jsonSchemaVersion="firestore/documentReference/1.0",nt._jsonSchema={type:yt("string",nt._jsonSchemaVersion),referencePath:yt("string")};class Jt extends Et{constructor(t,e,n){super(t,e,fr(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const t=this._path.popLast();return t.isEmpty()?null:new nt(this.firestore,null,new k(t))}withConverter(t){return new Jt(this.firestore,t,this._path)}}function pE(r,t,...e){if(r=It(r),Oa("collection","path",t),r instanceof Ds){const n=Q.fromString(t,...e);return rl(n),new Jt(r,null,n)}{if(!(r instanceof nt||r instanceof Jt))throw new C(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(Q.fromString(t,...e));return rl(n),new Jt(r.firestore,null,n)}}function gE(r,t){if(r=W(r,Ds),Oa("collectionGroup","collection id",t),t.indexOf("/")>=0)throw new C(R.INVALID_ARGUMENT,`Invalid collection ID '${t}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);return new Et(r,null,function(n){return new me(Q.emptyPath(),n)}(t))}function lm(r,t,...e){if(r=It(r),arguments.length===1&&(t=qi.newId()),Oa("doc","path",t),r instanceof Ds){const n=Q.fromString(t,...e);return nl(n),new nt(r,null,new k(n))}{if(!(r instanceof nt||r instanceof Jt))throw new C(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(Q.fromString(t,...e));return nl(n),new nt(r.firestore,r instanceof Jt?r.converter:null,new k(n))}}function _E(r,t){return r=It(r),t=It(t),(r instanceof nt||r instanceof Jt)&&(t instanceof nt||t instanceof Jt)&&r.firestore===t.firestore&&r.path===t.path&&r.converter===t.converter}function Pu(r,t){return r=It(r),t=It(t),r instanceof Et&&t instanceof Et&&r.firestore===t.firestore&&bs(r._query,t._query)&&r.converter===t.converter}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gh="AsyncQueue";class _h{constructor(t=Promise.resolve()){this.Zu=[],this.Xu=!1,this.ec=[],this.tc=null,this.nc=!1,this.rc=!1,this.sc=[],this.F_=new cu(this,"async_queue_retry"),this.oc=()=>{const n=yi();n&&N(gh,"Visibility state changed to "+n.visibilityState),this.F_.y_()},this._c=t;const e=yi();e&&typeof e.addEventListener=="function"&&e.addEventListener("visibilitychange",this.oc)}get isShuttingDown(){return this.Xu}enqueueAndForget(t){this.enqueue(t)}enqueueAndForgetEvenWhileRestricted(t){this.ac(),this.uc(t)}enterRestrictedMode(t){if(!this.Xu){this.Xu=!0,this.rc=t||!1;const e=yi();e&&typeof e.removeEventListener=="function"&&e.removeEventListener("visibilitychange",this.oc)}}enqueue(t){if(this.ac(),this.Xu)return new Promise(()=>{});const e=new At;return this.uc(()=>this.Xu&&this.rc?Promise.resolve():(t().then(e.resolve,e.reject),e.promise)).then(()=>e.promise)}enqueueRetryable(t){this.enqueueAndForget(()=>(this.Zu.push(t),this.cc()))}async cc(){if(this.Zu.length!==0){try{await this.Zu[0](),this.Zu.shift(),this.F_.reset()}catch(t){if(!ze(t))throw t;N(gh,"Operation failed with retryable error: "+t)}this.Zu.length>0&&this.F_.g_(()=>this.cc())}}uc(t){const e=this._c.then(()=>(this.nc=!0,t().catch(n=>{throw this.tc=n,this.nc=!1,pt("INTERNAL UNHANDLED ERROR: ",yh(n)),n}).then(n=>(this.nc=!1,n))));return this._c=e,e}enqueueAfterDelay(t,e,n){this.ac(),this.sc.indexOf(t)>-1&&(e=0);const s=fu.createAndSchedule(this,t,e,n,i=>this.lc(i));return this.ec.push(s),s}ac(){this.tc&&M(47125,{hc:yh(this.tc)})}verifyOperationInProgress(){}async Pc(){let t;do t=this._c,await t;while(t!==this._c)}Tc(t){for(const e of this.ec)if(e.timerId===t)return!0;return!1}Ic(t){return this.Pc().then(()=>{this.ec.sort((e,n)=>e.targetTimeMs-n.targetTimeMs);for(const e of this.ec)if(e.skipDelay(),t!=="all"&&e.timerId===t)break;return this.Pc()})}dc(t){this.sc.push(t)}lc(t){const e=this.ec.indexOf(t);this.ec.splice(e,1)}}function yh(r){let t=r.message||"";return r.stack&&(t=r.stack.includes(r.message)?r.stack:r.message+`
`+r.stack),t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jn(r){return function(e,n){if(typeof e!="object"||e===null)return!1;const s=e;for(const i of n)if(i in s&&typeof s[i]=="function")return!0;return!1}(r,["next","error","complete"])}class hm{constructor(){this._progressObserver={},this._taskCompletionResolver=new At,this._lastProgress={taskState:"Running",totalBytes:0,totalDocuments:0,bytesLoaded:0,documentsLoaded:0}}onProgress(t,e,n){this._progressObserver={next:t,error:e,complete:n}}catch(t){return this._taskCompletionResolver.promise.catch(t)}then(t,e){return this._taskCompletionResolver.promise.then(t,e)}_completeWith(t){this._updateProgress(t),this._progressObserver.complete&&this._progressObserver.complete(),this._taskCompletionResolver.resolve(t)}_failWith(t){this._lastProgress.taskState="Error",this._progressObserver.next&&this._progressObserver.next(this._lastProgress),this._progressObserver.error&&this._progressObserver.error(t),this._taskCompletionResolver.reject(t)}_updateProgress(t){this._lastProgress=t,this._progressObserver.next&&this._progressObserver.next(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yE=-1;class st extends Ds{constructor(t,e,n,s){super(t,e,n,s),this.type="firestore",this._queue=new _h,this._persistenceKey=s?.name||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const t=this._firestoreClient.terminate();this._queue=new _h(t),this._firestoreClient=void 0,await t}}}function IE(r,t,e){e||(e=ms);const n=xa(r,"firestore");if(n.isInitialized(e)){const s=n.getImmediate({identifier:e}),i=n.getOptions(e);if(Ne(i,t))return s;throw new C(R.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(t.cacheSizeBytes!==void 0&&t.localCache!==void 0)throw new C(R.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(t.cacheSizeBytes!==void 0&&t.cacheSizeBytes!==-1&&t.cacheSizeBytes<If)throw new C(R.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return t.host&&Ui(t.host)&&Sh(t.host),n.initialize({options:t,instanceIdentifier:e})}function EE(r,t){const e=typeof r=="object"?r:Bg(),n=typeof r=="string"?r:t||ms,s=xa(e,"firestore").getImmediate({identifier:n});if(!s._initialized){const i=bp("firestore");i&&cm(s,...i)}return s}function dt(r){if(r._terminated)throw new C(R.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||dm(r),r._firestoreClient}function dm(r){var t,e,n;const s=r._freezeSettings(),i=function(u,c,h,f){return new q_(u,c,h,f.host,f.ssl,f.experimentalForceLongPolling,f.experimentalAutoDetectLongPolling,am(f.experimentalLongPollingOptions),f.useFetchStreams,f.isUsingEmulator)}(r._databaseId,((t=r._app)===null||t===void 0?void 0:t.options.appId)||"",r._persistenceKey,s);r._componentsProvider||!((e=s.localCache)===null||e===void 0)&&e._offlineComponentProvider&&(!((n=s.localCache)===null||n===void 0)&&n._onlineComponentProvider)&&(r._componentsProvider={_offline:s.localCache._offlineComponentProvider,_online:s.localCache._onlineComponentProvider}),r._firestoreClient=new rE(r._authCredentials,r._appCheckCredentials,r._queue,i,r._componentsProvider&&function(u){const c=u?._online.build();return{_offline:u?._offline.build(c),_online:c}}(r._componentsProvider))}function TE(r,t){Ft("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const e=r._freezeSettings();return fm(r,Ue.provider,{build:n=>new bu(n,e.cacheSizeBytes,t?.forceOwnership)}),Promise.resolve()}async function vE(r){Ft("enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const t=r._freezeSettings();fm(r,Ue.provider,{build:e=>new tm(e,t.cacheSizeBytes)})}function fm(r,t,e){if((r=W(r,st))._firestoreClient||r._terminated)throw new C(R.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");if(r._componentsProvider||r._getSettings().localCache)throw new C(R.FAILED_PRECONDITION,"SDK cache is already specified.");r._componentsProvider={_online:t,_offline:e},dm(r)}function wE(r){if(r._initialized&&!r._terminated)throw new C(R.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");const t=new At;return r._queue.enqueueAndForgetEvenWhileRestricted(async()=>{try{await async function(n){if(!re.C())return Promise.resolve();const s=n+bf;await re.delete(s)}(iu(r._databaseId,r._persistenceKey)),t.resolve()}catch(e){t.reject(e)}}),t.promise}function AE(r){return function(e){const n=new At;return e.asyncQueue.enqueueAndForget(async()=>qI(await Su(e),n)),n.promise}(dt(r=W(r,st)))}function bE(r){return sE(dt(r=W(r,st)))}function RE(r){return iE(dt(r=W(r,st)))}function SE(r){return Ng(r.app,"firestore",r._databaseId.database),r._delete()}function Va(r,t){const e=dt(r=W(r,st)),n=new hm;return lE(e,r._databaseId,t,n),n}function mm(r,t){return hE(dt(r=W(r,st)),t).then(e=>e?new Et(r,null,e.query):null)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lr{constructor(t="count",e){this._internalFieldPath=e,this.type="AggregateField",this.aggregateType=t}}class pm{constructor(t,e,n){this._userDataWriter=e,this._data=n,this.type="AggregateQuerySnapshot",this.query=t}data(){return this._userDataWriter.convertObjectMap(this._data)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bt{constructor(t){this._byteString=t}static fromBase64String(t){try{return new Bt(ft.fromBase64String(t))}catch(e){throw new C(R.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+e)}}static fromUint8Array(t){return new Bt(ft.fromUint8Array(t))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(t){return this._byteString.isEqual(t._byteString)}toJSON(){return{type:Bt._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(t){if(vn(t,Bt._jsonSchema))return Bt.fromBase64String(t.bytes)}}Bt._jsonSchemaVersion="firestore/bytes/1.0",Bt._jsonSchema={type:yt("string",Bt._jsonSchemaVersion),bytes:yt("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qe{constructor(...t){for(let e=0;e<t.length;++e)if(t[e].length===0)throw new C(R.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new ct(t)}isEqual(t){return this._internalPath.isEqual(t._internalPath)}}function PE(){return new Qe(ia)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class We{constructor(t){this._methodName=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yt{constructor(t,e){if(!isFinite(t)||t<-90||t>90)throw new C(R.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+t);if(!isFinite(e)||e<-180||e>180)throw new C(R.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+e);this._lat=t,this._long=e}get latitude(){return this._lat}get longitude(){return this._long}isEqual(t){return this._lat===t._lat&&this._long===t._long}_compareTo(t){return z(this._lat,t._lat)||z(this._long,t._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Yt._jsonSchemaVersion}}static fromJSON(t){if(vn(t,Yt._jsonSchema))return new Yt(t.latitude,t.longitude)}}Yt._jsonSchemaVersion="firestore/geoPoint/1.0",Yt._jsonSchema={type:yt("string",Yt._jsonSchemaVersion),latitude:yt("number"),longitude:yt("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wt{constructor(t){this._values=(t||[]).map(e=>e)}toArray(){return this._values.map(t=>t)}isEqual(t){return function(n,s){if(n.length!==s.length)return!1;for(let i=0;i<n.length;++i)if(n[i]!==s[i])return!1;return!0}(this._values,t._values)}toJSON(){return{type:Wt._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(t){if(vn(t,Wt._jsonSchema)){if(Array.isArray(t.vectorValues)&&t.vectorValues.every(e=>typeof e=="number"))return new Wt(t.vectorValues);throw new C(R.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}Wt._jsonSchemaVersion="firestore/vectorValue/1.0",Wt._jsonSchema={type:yt("string",Wt._jsonSchemaVersion),vectorValues:yt("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const VE=/^__.*__$/;class CE{constructor(t,e,n){this.data=t,this.fieldMask=e,this.fieldTransforms=n}toMutation(t,e){return this.fieldMask!==null?new ge(t,this.data,this.fieldMask,e,this.fieldTransforms):new mr(t,this.data,e,this.fieldTransforms)}}class gm{constructor(t,e,n){this.data=t,this.fieldMask=e,this.fieldTransforms=n}toMutation(t,e){return new ge(t,this.data,this.fieldMask,e,this.fieldTransforms)}}function _m(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw M(40011,{Ec:r})}}class uo{constructor(t,e,n,s,i,o){this.settings=t,this.databaseId=e,this.serializer=n,this.ignoreUndefinedProperties=s,i===void 0&&this.Ac(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Ec(){return this.settings.Ec}Rc(t){return new uo(Object.assign(Object.assign({},this.settings),t),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Vc(t){var e;const n=(e=this.path)===null||e===void 0?void 0:e.child(t),s=this.Rc({path:n,mc:!1});return s.fc(t),s}gc(t){var e;const n=(e=this.path)===null||e===void 0?void 0:e.child(t),s=this.Rc({path:n,mc:!1});return s.Ac(),s}yc(t){return this.Rc({path:void 0,mc:!0})}wc(t){return Li(t,this.settings.methodName,this.settings.Sc||!1,this.path,this.settings.bc)}contains(t){return this.fieldMask.find(e=>t.isPrefixOf(e))!==void 0||this.fieldTransforms.find(e=>t.isPrefixOf(e.field))!==void 0}Ac(){if(this.path)for(let t=0;t<this.path.length;t++)this.fc(this.path.get(t))}fc(t){if(t.length===0)throw this.wc("Document fields must not be empty");if(_m(this.Ec)&&VE.test(t))throw this.wc('Document fields cannot begin and end with "__"')}}class DE{constructor(t,e,n){this.databaseId=t,this.ignoreUndefinedProperties=e,this.serializer=n||wn(t)}Dc(t,e,n,s=!1){return new uo({Ec:t,methodName:e,bc:n,path:ct.emptyPath(),mc:!1,Sc:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function An(r){const t=r._freezeSettings(),e=wn(r._databaseId);return new DE(r._databaseId,!!t.ignoreUndefinedProperties,e)}function co(r,t,e,n,s,i={}){const o=r.Dc(i.merge||i.mergeFields?2:0,t,e,s);Ou("Data must be an object, but it was:",o,n);const u=Em(n,o);let c,h;if(i.merge)c=new qt(o.fieldMask),h=o.fieldTransforms;else if(i.mergeFields){const f=[];for(const m of i.mergeFields){const g=Es(t,m,e);if(!o.contains(g))throw new C(R.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);vm(f,g)||f.push(g)}c=new qt(f),h=o.fieldTransforms.filter(m=>c.covers(m.field))}else c=null,h=o.fieldTransforms;return new CE(new St(u),c,h)}class xs extends We{_toFieldTransform(t){if(t.Ec!==2)throw t.Ec===1?t.wc(`${this._methodName}() can only appear at the top level of your update data`):t.wc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return t.fieldMask.push(t.path),null}isEqual(t){return t instanceof xs}}function ym(r,t,e){return new uo({Ec:3,bc:t.settings.bc,methodName:r._methodName,mc:e},t.databaseId,t.serializer,t.ignoreUndefinedProperties)}class Vu extends We{_toFieldTransform(t){return new Ss(t.path,new er)}isEqual(t){return t instanceof Vu}}class Cu extends We{constructor(t,e){super(t),this.vc=e}_toFieldTransform(t){const e=ym(this,t,!0),n=this.vc.map(i=>bn(i,e)),s=new pn(n);return new Ss(t.path,s)}isEqual(t){return t instanceof Cu&&Ne(this.vc,t.vc)}}class Du extends We{constructor(t,e){super(t),this.vc=e}_toFieldTransform(t){const e=ym(this,t,!0),n=this.vc.map(i=>bn(i,e)),s=new gn(n);return new Ss(t.path,s)}isEqual(t){return t instanceof Du&&Ne(this.vc,t.vc)}}class xu extends We{constructor(t,e){super(t),this.Cc=e}_toFieldTransform(t){const e=new nr(t.serializer,qd(t.serializer,this.Cc));return new Ss(t.path,e)}isEqual(t){return t instanceof xu&&this.Cc===t.Cc}}function Nu(r,t,e,n){const s=r.Dc(1,t,e);Ou("Data must be an object, but it was:",s,n);const i=[],o=St.empty();$e(n,(c,h)=>{const f=lo(t,c,e);h=It(h);const m=s.gc(f);if(h instanceof xs)i.push(f);else{const g=bn(h,m);g!=null&&(i.push(f),o.set(f,g))}});const u=new qt(i);return new gm(o,u,s.fieldTransforms)}function ku(r,t,e,n,s,i){const o=r.Dc(1,t,e),u=[Es(t,n,e)],c=[s];if(i.length%2!=0)throw new C(R.INVALID_ARGUMENT,`Function ${t}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<i.length;g+=2)u.push(Es(t,i[g])),c.push(i[g+1]);const h=[],f=St.empty();for(let g=u.length-1;g>=0;--g)if(!vm(h,u[g])){const w=u[g];let V=c[g];V=It(V);const D=o.gc(w);if(V instanceof xs)h.push(w);else{const x=bn(V,D);x!=null&&(h.push(w),f.set(w,x))}}const m=new qt(h);return new gm(f,m,o.fieldTransforms)}function Im(r,t,e,n=!1){return bn(e,r.Dc(n?4:3,t))}function bn(r,t){if(Tm(r=It(r)))return Ou("Unsupported field value:",t,r),Em(r,t);if(r instanceof We)return function(n,s){if(!_m(s.Ec))throw s.wc(`${n._methodName}() can only be used with update() and set()`);if(!s.path)throw s.wc(`${n._methodName}() is not currently supported inside arrays`);const i=n._toFieldTransform(s);i&&s.fieldTransforms.push(i)}(r,t),null;if(r===void 0&&t.ignoreUndefinedProperties)return null;if(t.path&&t.fieldMask.push(t.path),r instanceof Array){if(t.settings.mc&&t.Ec!==4)throw t.wc("Nested arrays are not supported");return function(n,s){const i=[];let o=0;for(const u of n){let c=bn(u,s.yc(o));c==null&&(c={nullValue:"NULL_VALUE"}),i.push(c),o++}return{arrayValue:{values:i}}}(r,t)}return function(n,s){if((n=It(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return qd(s.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const i=Z.fromDate(n);return{timestampValue:rr(s.serializer,i)}}if(n instanceof Z){const i=new Z(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:rr(s.serializer,i)}}if(n instanceof Yt)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof Bt)return{bytesValue:Zd(s.serializer,n._byteString)};if(n instanceof nt){const i=s.databaseId,o=n.firestore._databaseId;if(!o.isEqual(i))throw s.wc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${i.projectId}/${i.database}`);return{referenceValue:Za(n.firestore._databaseId||s.databaseId,n._key.path)}}if(n instanceof Wt)return function(o,u){return{mapValue:{fields:{[ja]:{stringValue:za},[Yn]:{arrayValue:{values:o.toArray().map(h=>{if(typeof h!="number")throw u.wc("VectorValues must only contain numeric values.");return Qa(u.serializer,h)})}}}}}}(n,s);throw s.wc(`Unsupported field value: ${ji(n)}`)}(r,t)}function Em(r,t){const e={};return md(r)?t.path&&t.path.length>0&&t.fieldMask.push(t.path):$e(r,(n,s)=>{const i=bn(s,t.Vc(n));i!=null&&(e[n]=i)}),{mapValue:{fields:e}}}function Tm(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof Z||r instanceof Yt||r instanceof Bt||r instanceof nt||r instanceof We||r instanceof Wt)}function Ou(r,t,e){if(!Tm(e)||!Hh(e)){const n=ji(e);throw n==="an object"?t.wc(r+" a custom object"):t.wc(r+" "+n)}}function Es(r,t,e){if((t=It(t))instanceof Qe)return t._internalPath;if(typeof t=="string")return lo(r,t);throw Li("Field path arguments must be of type string or ",r,!1,void 0,e)}const xE=new RegExp("[~\\*/\\[\\]]");function lo(r,t,e){if(t.search(xE)>=0)throw Li(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,e);try{return new Qe(...t.split("."))._internalPath}catch{throw Li(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,e)}}function Li(r,t,e,n,s){const i=n&&!n.isEmpty(),o=s!==void 0;let u=`Function ${t}() called with invalid data`;e&&(u+=" (via `toFirestore()`)"),u+=". ";let c="";return(i||o)&&(c+=" (found",i&&(c+=` in field ${n}`),o&&(c+=` in document ${s}`),c+=")"),new C(R.INVALID_ARGUMENT,u+r+c)}function vm(r,t){return r.some(e=>e.isEqual(t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ts{constructor(t,e,n,s,i){this._firestore=t,this._userDataWriter=e,this._key=n,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new nt(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const t=new NE(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(t)}return this._userDataWriter.convertValue(this._document.data.value)}}get(t){if(this._document){const e=this._document.data.field(ho("DocumentSnapshot.get",t));if(e!==null)return this._userDataWriter.convertValue(e)}}}class NE extends Ts{data(){return super.data()}}function ho(r,t){return typeof t=="string"?lo(r,t):t instanceof Qe?t._internalPath:t._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wm(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new C(R.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class Fu{}class Tr extends Fu{}function kE(r,t,...e){let n=[];t instanceof Fu&&n.push(t),n=n.concat(e),function(i){const o=i.filter(c=>c instanceof Rn).length,u=i.filter(c=>c instanceof vr).length;if(o>1||o>0&&u>0)throw new C(R.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(n);for(const s of n)r=s._apply(r);return r}class vr extends Tr{constructor(t,e,n){super(),this._field=t,this._op=e,this._value=n,this.type="where"}static _create(t,e,n){return new vr(t,e,n)}_apply(t){const e=this._parse(t);return bm(t._query,e),new Et(t.firestore,t.converter,ga(t._query,e))}_parse(t){const e=An(t.firestore);return function(i,o,u,c,h,f,m){let g;if(h.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new C(R.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){Eh(m,f);const V=[];for(const D of m)V.push(Ih(c,i,D));g={arrayValue:{values:V}}}else g=Ih(c,i,m)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||Eh(m,f),g=Im(u,o,m,f==="in"||f==="not-in");return H.create(h,f,g)}(t._query,"where",e,t.firestore._databaseId,this._field,this._op,this._value)}}function OE(r,t,e){const n=t,s=ho("where",r);return vr._create(s,n,e)}class Rn extends Fu{constructor(t,e){super(),this.type=t,this._queryConstraints=e}static _create(t,e){return new Rn(t,e)}_parse(t){const e=this._queryConstraints.map(n=>n._parse(t)).filter(n=>n.getFilters().length>0);return e.length===1?e[0]:et.create(e,this._getOperator())}_apply(t){const e=this._parse(t);return e.getFilters().length===0?t:(function(s,i){let o=s;const u=i.getFlattenedFilters();for(const c of u)bm(o,c),o=ga(o,c)}(t._query,e),new Et(t.firestore,t.converter,ga(t._query,e)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}function FE(...r){return r.forEach(t=>Rm("or",t)),Rn._create("or",r)}function ME(...r){return r.forEach(t=>Rm("and",t)),Rn._create("and",r)}class fo extends Tr{constructor(t,e){super(),this._field=t,this._direction=e,this.type="orderBy"}static _create(t,e){return new fo(t,e)}_apply(t){const e=function(s,i,o){if(s.startAt!==null)throw new C(R.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(s.endAt!==null)throw new C(R.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new _s(i,o)}(t._query,this._field,this._direction);return new Et(t.firestore,t.converter,function(s,i){const o=s.explicitOrderBy.concat([i]);return new me(s.path,s.collectionGroup,o,s.filters.slice(),s.limit,s.limitType,s.startAt,s.endAt)}(t._query,e))}}function LE(r,t="asc"){const e=t,n=ho("orderBy",r);return fo._create(n,e)}class Ns extends Tr{constructor(t,e,n){super(),this.type=t,this._limit=e,this._limitType=n}static _create(t,e,n){return new Ns(t,e,n)}_apply(t){return new Et(t.firestore,t.converter,Pi(t._query,this._limit,this._limitType))}}function BE(r){return Xh("limit",r),Ns._create("limit",r,"F")}function UE(r){return Xh("limitToLast",r),Ns._create("limitToLast",r,"L")}class ks extends Tr{constructor(t,e,n){super(),this.type=t,this._docOrFields=e,this._inclusive=n}static _create(t,e,n){return new ks(t,e,n)}_apply(t){const e=Am(t,this.type,this._docOrFields,this._inclusive);return new Et(t.firestore,t.converter,function(s,i){return new me(s.path,s.collectionGroup,s.explicitOrderBy.slice(),s.filters.slice(),s.limit,s.limitType,i,s.endAt)}(t._query,e))}}function qE(...r){return ks._create("startAt",r,!0)}function jE(...r){return ks._create("startAfter",r,!1)}class Os extends Tr{constructor(t,e,n){super(),this.type=t,this._docOrFields=e,this._inclusive=n}static _create(t,e,n){return new Os(t,e,n)}_apply(t){const e=Am(t,this.type,this._docOrFields,this._inclusive);return new Et(t.firestore,t.converter,function(s,i){return new me(s.path,s.collectionGroup,s.explicitOrderBy.slice(),s.filters.slice(),s.limit,s.limitType,s.startAt,i)}(t._query,e))}}function zE(...r){return Os._create("endBefore",r,!1)}function $E(...r){return Os._create("endAt",r,!0)}function Am(r,t,e,n){if(e[0]=It(e[0]),e[0]instanceof Ts)return function(i,o,u,c,h){if(!c)throw new C(R.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${u}().`);const f=[];for(const m of qn(i))if(m.field.isKeyField())f.push(fn(o,c.key));else{const g=c.data.field(m.field);if(Qi(g))throw new C(R.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+m.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(g===null){const w=m.field.canonicalString();throw new C(R.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${w}' (used as the orderBy) does not exist.`)}f.push(g)}return new Le(f,h)}(r._query,r.firestore._databaseId,t,e[0]._document,n);{const s=An(r.firestore);return function(o,u,c,h,f,m){const g=o.explicitOrderBy;if(f.length>g.length)throw new C(R.INVALID_ARGUMENT,`Too many arguments provided to ${h}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const w=[];for(let V=0;V<f.length;V++){const D=f[V];if(g[V].field.isKeyField()){if(typeof D!="string")throw new C(R.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${h}(), but got a ${typeof D}`);if(!Ga(o)&&D.indexOf("/")!==-1)throw new C(R.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${h}() must be a plain document ID, but '${D}' contains a slash.`);const x=o.path.child(Q.fromString(D));if(!k.isDocumentKey(x))throw new C(R.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${h}() must result in a valid document path, but '${x}' is not because it contains an odd number of segments.`);const L=new k(x);w.push(fn(u,L))}else{const x=Im(c,h,D);w.push(x)}}return new Le(w,m)}(r._query,r.firestore._databaseId,s,t,e,n)}}function Ih(r,t,e){if(typeof(e=It(e))=="string"){if(e==="")throw new C(R.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!Ga(t)&&e.indexOf("/")!==-1)throw new C(R.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${e}' contains a '/' character.`);const n=t.path.child(Q.fromString(e));if(!k.isDocumentKey(n))throw new C(R.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return fn(r,new k(n))}if(e instanceof nt)return fn(r,e._key);throw new C(R.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${ji(e)}.`)}function Eh(r,t){if(!Array.isArray(r)||r.length===0)throw new C(R.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${t.toString()}' filters.`)}function bm(r,t){const e=function(s,i){for(const o of s)for(const u of o.getFlattenedFilters())if(i.indexOf(u.op)>=0)return u.op;return null}(r.filters,function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(t.op));if(e!==null)throw e===t.op?new C(R.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${t.op.toString()}' filter.`):new C(R.INVALID_ARGUMENT,`Invalid query. You cannot use '${t.op.toString()}' filters with '${e.toString()}' filters.`)}function Rm(r,t){if(!(t instanceof vr||t instanceof Rn))throw new C(R.INVALID_ARGUMENT,`Function ${r}() requires AppliableConstraints created with a call to 'where(...)', 'or(...)', or 'and(...)'.`)}class Mu{convertValue(t,e="none"){switch(Fe(t)){case 0:return null;case 1:return t.booleanValue;case 2:return lt(t.integerValue||t.doubleValue);case 3:return this.convertTimestamp(t.timestampValue);case 4:return this.convertServerTimestamp(t,e);case 5:return t.stringValue;case 6:return this.convertBytes(fe(t.bytesValue));case 7:return this.convertReference(t.referenceValue);case 8:return this.convertGeoPoint(t.geoPointValue);case 9:return this.convertArray(t.arrayValue,e);case 11:return this.convertObject(t.mapValue,e);case 10:return this.convertVectorValue(t.mapValue);default:throw M(62114,{value:t})}}convertObject(t,e){return this.convertObjectMap(t.fields,e)}convertObjectMap(t,e="none"){const n={};return $e(t,(s,i)=>{n[s]=this.convertValue(i,e)}),n}convertVectorValue(t){var e,n,s;const i=(s=(n=(e=t.fields)===null||e===void 0?void 0:e[Yn].arrayValue)===null||n===void 0?void 0:n.values)===null||s===void 0?void 0:s.map(o=>lt(o.doubleValue));return new Wt(i)}convertGeoPoint(t){return new Yt(lt(t.latitude),lt(t.longitude))}convertArray(t,e){return(t.values||[]).map(n=>this.convertValue(n,e))}convertServerTimestamp(t,e){switch(e){case"previous":const n=Wi(t);return n==null?null:this.convertValue(n,e);case"estimate":return this.convertTimestamp(fs(t));default:return null}}convertTimestamp(t){const e=de(t);return new Z(e.seconds,e.nanos)}convertDocumentKey(t,e){const n=Q.fromString(t);U(lf(n),9688,{name:t});const s=new Oe(n.get(1),n.get(3)),i=new k(n.popFirst(5));return s.isEqual(e)||pt(`Document ${i} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${e.projectId}/${e.database}) instead.`),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mo(r,t,e){let n;return n=r?e&&(e.merge||e.mergeFields)?r.toFirestore(t,e):r.toFirestore(t):t,n}class Lu extends Mu{constructor(t){super(),this.firestore=t}convertBytes(t){return new Bt(t)}convertReference(t){const e=this.convertDocumentKey(t,this.firestore._databaseId);return new nt(this.firestore,null,e)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function GE(r){return new lr("sum",Es("sum",r))}function KE(r){return new lr("avg",Es("average",r))}function Sm(){return new lr("count")}function QE(r,t){var e,n;return r instanceof lr&&t instanceof lr&&r.aggregateType===t.aggregateType&&((e=r._internalFieldPath)===null||e===void 0?void 0:e.canonicalString())===((n=t._internalFieldPath)===null||n===void 0?void 0:n.canonicalString())}function WE(r,t){return Pu(r.query,t.query)&&Ne(r.data(),t.data())}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pm="NOT SUPPORTED";class le{constructor(t,e){this.hasPendingWrites=t,this.fromCache=e}isEqual(t){return this.hasPendingWrites===t.hasPendingWrites&&this.fromCache===t.fromCache}}class zt extends Ts{constructor(t,e,n,s,i,o){super(t,e,n,s,o),this._firestore=t,this._firestoreImpl=t,this.metadata=i}exists(){return super.exists()}data(t={}){if(this._document){if(this._converter){const e=new os(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(e,t)}return this._userDataWriter.convertValue(this._document.data.value,t.serverTimestamps)}}get(t,e={}){if(this._document){const n=this._document.data.field(ho("DocumentSnapshot.get",t));if(n!==null)return this._userDataWriter.convertValue(n,e.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new C(R.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const t=this._document,e={};return e.type=zt._jsonSchemaVersion,e.bundle="",e.bundleSource="DocumentSnapshot",e.bundleName=this._key.toString(),!t||!t.isValidDocument()||!t.isFoundDocument()?e:(this._userDataWriter.convertObjectMap(t.data.value.mapValue.fields,"previous"),e.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),e)}}function HE(r,t,e){if(vn(t,zt._jsonSchema)){if(t.bundle===Pm)throw new C(R.INVALID_ARGUMENT,"The provided JSON object was created in a client environment, which is not supported.");const n=wn(r._databaseId),s=om(t.bundle,n),i=s.Ku(),o=new yu(s.getMetadata(),n);for(const f of i)o.Wa(f);const u=o.documents;if(u.length!==1)throw new C(R.INVALID_ARGUMENT,`Expected bundle data to contain 1 document, but it contains ${u.length} documents.`);const c=Yi(n,u[0].document),h=new k(Q.fromString(t.bundleName));return new zt(r,new Lu(r),h,c,new le(!1,!1),e||null)}}zt._jsonSchemaVersion="firestore/documentSnapshot/1.0",zt._jsonSchema={type:yt("string",zt._jsonSchemaVersion),bundleSource:yt("string","DocumentSnapshot"),bundleName:yt("string"),bundle:yt("string")};class os extends zt{data(t={}){return super.data(t)}}class $t{constructor(t,e,n,s){this._firestore=t,this._userDataWriter=e,this._snapshot=s,this.metadata=new le(s.hasPendingWrites,s.fromCache),this.query=n}get docs(){const t=[];return this.forEach(e=>t.push(e)),t}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(t,e){this._snapshot.docs.forEach(n=>{t.call(e,new os(this._firestore,this._userDataWriter,n.key,n,new le(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(t={}){const e=!!t.includeMetadataChanges;if(e&&this._snapshot.excludesMetadataChanges)throw new C(R.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===e||(this._cachedChanges=function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map(u=>{const c=new os(s._firestore,s._userDataWriter,u.doc.key,u.doc,new le(s._snapshot.mutatedKeys.has(u.doc.key),s._snapshot.fromCache),s.query.converter);return u.doc,{type:"added",doc:c,oldIndex:-1,newIndex:o++}})}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(u=>i||u.type!==3).map(u=>{const c=new os(s._firestore,s._userDataWriter,u.doc.key,u.doc,new le(s._snapshot.mutatedKeys.has(u.doc.key),s._snapshot.fromCache),s.query.converter);let h=-1,f=-1;return u.type!==0&&(h=o.indexOf(u.doc.key),o=o.delete(u.doc.key)),u.type!==1&&(o=o.add(u.doc),f=o.indexOf(u.doc.key)),{type:JE(u.type),doc:c,oldIndex:h,newIndex:f}})}}(this,e),this._cachedChangesIncludeMetadataChanges=e),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new C(R.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const t={};t.type=$t._jsonSchemaVersion,t.bundleSource="QuerySnapshot",t.bundleName=qi.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const e=[],n=[],s=[];return this.docs.forEach(i=>{i._document!==null&&(e.push(i._document),n.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))}),t.bundle=(this._firestore,this.query._query,t.bundleName,"NOT SUPPORTED"),t}}function XE(r,t,e){if(vn(t,$t._jsonSchema)){if(t.bundle===Pm)throw new C(R.INVALID_ARGUMENT,"The provided JSON object was created in a client environment, which is not supported.");const n=wn(r._databaseId),s=om(t.bundle,n),i=s.Ku(),o=new yu(s.getMetadata(),n);for(const g of i)o.Wa(g);if(o.queries.length!==1)throw new C(R.INVALID_ARGUMENT,`Snapshot data expected 1 query but found ${o.queries.length} queries.`);const u=to(o.queries[0].bundledQuery),c=o.documents;let h=new dn;c.map(g=>{const w=Yi(n,g.document);h=h.add(w)});const f=Tn.fromInitialDocuments(u,h,$(),!1,!1),m=new Et(r,e||null,u);return new $t(r,new Lu(r),m,f)}}function JE(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return M(61501,{type:r})}}function YE(r,t){return r instanceof zt&&t instanceof zt?r._firestore===t._firestore&&r._key.isEqual(t._key)&&(r._document===null?t._document===null:r._document.isEqual(t._document))&&r._converter===t._converter:r instanceof $t&&t instanceof $t&&r._firestore===t._firestore&&Pu(r.query,t.query)&&r.metadata.isEqual(t.metadata)&&r._snapshot.isEqual(t._snapshot)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ZE(r){r=W(r,nt);const t=W(r.firestore,st);return sm(dt(t),r._key).then(e=>Bu(t,r,e))}$t._jsonSchemaVersion="firestore/querySnapshot/1.0",$t._jsonSchema={type:yt("string",$t._jsonSchemaVersion),bundleSource:yt("string","QuerySnapshot"),bundleName:yt("string"),bundle:yt("string")};class He extends Mu{constructor(t){super(),this.firestore=t}convertBytes(t){return new Bt(t)}convertReference(t){const e=this.convertDocumentKey(t,this.firestore._databaseId);return new nt(this.firestore,null,e)}}function tT(r){r=W(r,nt);const t=W(r.firestore,st),e=dt(t),n=new He(t);return oE(e,r._key).then(s=>new zt(t,n,r._key,s,new le(s!==null&&s.hasLocalMutations,!0),r.converter))}function eT(r){r=W(r,nt);const t=W(r.firestore,st);return sm(dt(t),r._key,{source:"server"}).then(e=>Bu(t,r,e))}function nT(r){r=W(r,Et);const t=W(r.firestore,st),e=dt(t),n=new He(t);return wm(r._query),im(e,r._query).then(s=>new $t(t,n,r,s))}function rT(r){r=W(r,Et);const t=W(r.firestore,st),e=dt(t),n=new He(t);return aE(e,r._query).then(s=>new $t(t,n,r,s))}function sT(r){r=W(r,Et);const t=W(r.firestore,st),e=dt(t),n=new He(t);return im(e,r._query,{source:"server"}).then(s=>new $t(t,n,r,s))}function iT(r,t,e){r=W(r,nt);const n=W(r.firestore,st),s=mo(r.converter,t,e);return wr(n,[co(An(n),"setDoc",r._key,s,r.converter!==null,e).toMutation(r._key,ht.none())])}function oT(r,t,e,...n){r=W(r,nt);const s=W(r.firestore,st),i=An(s);let o;return o=typeof(t=It(t))=="string"||t instanceof Qe?ku(i,"updateDoc",r._key,t,e,n):Nu(i,"updateDoc",r._key,t),wr(s,[o.toMutation(r._key,ht.exists(!0))])}function aT(r){return wr(W(r.firestore,st),[new pr(r._key,ht.none())])}function uT(r,t){const e=W(r.firestore,st),n=lm(r),s=mo(r.converter,t);return wr(e,[co(An(r.firestore),"addDoc",n._key,s,r.converter!==null,{}).toMutation(n._key,ht.exists(!1))]).then(()=>n)}function Ca(r,...t){var e,n,s;r=It(r);let i={includeMetadataChanges:!1,source:"default"},o=0;typeof t[o]!="object"||jn(t[o])||(i=t[o++]);const u={includeMetadataChanges:i.includeMetadataChanges,source:i.source};if(jn(t[o])){const m=t[o];t[o]=(e=m.next)===null||e===void 0?void 0:e.bind(m),t[o+1]=(n=m.error)===null||n===void 0?void 0:n.bind(m),t[o+2]=(s=m.complete)===null||s===void 0?void 0:s.bind(m)}let c,h,f;if(r instanceof nt)h=W(r.firestore,st),f=fr(r._key.path),c={next:m=>{t[o]&&t[o](Bu(h,r,m))},error:t[o+1],complete:t[o+2]};else{const m=W(r,Et);h=W(m.firestore,st),f=m._query;const g=new He(h);c={next:w=>{t[o]&&t[o](new $t(h,g,m,w))},error:t[o+1],complete:t[o+2]},wm(r._query)}return function(g,w,V,D){const x=new oo(D),L=new _u(w,x,V);return g.asyncQueue.enqueueAndForget(async()=>mu(await cr(g),L)),()=>{x.Ou(),g.asyncQueue.enqueueAndForget(async()=>pu(await cr(g),L))}}(dt(h),f,u,c)}function cT(r,t,...e){const n=It(r),s=function(c){const h={bundle:"",bundleName:"",bundleSource:""},f=["bundle","bundleName","bundleSource"];for(const m of f){if(!(m in c)){h.error=`snapshotJson missing required field: ${m}`;break}const g=c[m];if(typeof g!="string"){h.error=`snapshotJson field '${m}' must be a string.`;break}if(g.length===0){h.error=`snapshotJson field '${m}' cannot be an empty string.`;break}m==="bundle"?h.bundle=g:m==="bundleName"?h.bundleName=g:m==="bundleSource"&&(h.bundleSource=g)}return h}(t);if(s.error)throw new C(R.INVALID_ARGUMENT,s.error);let i,o=0;if(typeof e[o]!="object"||jn(e[o])||(i=e[o++]),s.bundleSource==="QuerySnapshot"){let u=null;if(typeof e[o]=="object"&&jn(e[o])){const c=e[o++];u={next:c.next,error:c.error,complete:c.complete}}else u={next:e[o++],error:e[o++],complete:e[o++]};return function(h,f,m,g,w){let V,D=!1;return Va(h,f.bundle).then(()=>mm(h,f.bundleName)).then(L=>{L&&!D&&(w&&L.withConverter(w),V=Ca(L,m||{},g))}).catch(L=>(g.error&&g.error(L),()=>{})),()=>{D||(D=!0,V&&V())}}(n,s,i,u,e[o])}if(s.bundleSource==="DocumentSnapshot"){let u=null;if(typeof e[o]=="object"&&jn(e[o])){const c=e[o++];u={next:c.next,error:c.error,complete:c.complete}}else u={next:e[o++],error:e[o++],complete:e[o++]};return function(h,f,m,g,w){let V,D=!1;return Va(h,f.bundle).then(()=>{if(!D){const L=new nt(h,w||null,k.fromPath(f.bundleName));V=Ca(L,m||{},g)}}).catch(L=>(g.error&&g.error(L),()=>{})),()=>{D||(D=!0,V&&V())}}(n,s,i,u,e[o])}throw new C(R.INVALID_ARGUMENT,`unsupported bundle source: ${s.bundleSource}`)}function lT(r,t){return cE(dt(r=W(r,st)),jn(t)?t:{next:t})}function wr(r,t){return function(n,s){const i=new At;return n.asyncQueue.enqueueAndForget(async()=>MI(await Su(n),s,i)),i.promise}(dt(r),t)}function Bu(r,t,e){const n=e.docs.get(t._key),s=new He(r);return new zt(r,s,t._key,n,new le(e.hasPendingWrites,e.fromCache),t.converter)}function hT(r){return Vm(r,{count:Sm()})}function Vm(r,t){const e=W(r.firestore,st),n=dt(e),s=fd(t,(i,o)=>new Wd(o,i.aggregateType,i._internalFieldPath));return uE(n,r._query,s).then(i=>function(u,c,h){const f=new He(u);return new pm(c,f,h)}(e,r,i))}class dT{constructor(t){this.kind="memory",this._onlineComponentProvider=Ue.provider,t?.garbageCollector?this._offlineComponentProvider=t.garbageCollector._offlineComponentProvider:this._offlineComponentProvider={build:()=>new Au(void 0)}}toJSON(){return{kind:this.kind}}}class fT{constructor(t){let e;this.kind="persistent",t?.tabManager?(t.tabManager._initialize(t),e=t.tabManager):(e=Cm(void 0),e._initialize(t)),this._onlineComponentProvider=e._onlineComponentProvider,this._offlineComponentProvider=e._offlineComponentProvider}toJSON(){return{kind:this.kind}}}class mT{constructor(){this.kind="memoryEager",this._offlineComponentProvider=ur.provider}toJSON(){return{kind:this.kind}}}class pT{constructor(t){this.kind="memoryLru",this._offlineComponentProvider={build:()=>new Au(t)}}toJSON(){return{kind:this.kind}}}function gT(){return new mT}function _T(r){return new pT(r?.cacheSizeBytes)}function yT(r){return new dT(r)}function IT(r){return new fT(r)}class ET{constructor(t){this.forceOwnership=t,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(t){this._onlineComponentProvider=Ue.provider,this._offlineComponentProvider={build:e=>new bu(e,t?.cacheSizeBytes,this.forceOwnership)}}}class TT{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(t){this._onlineComponentProvider=Ue.provider,this._offlineComponentProvider={build:e=>new tm(e,t?.cacheSizeBytes)}}}function Cm(r){return new ET(r?.forceOwnership)}function vT(){return new TT}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wT={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dm{constructor(t,e){this._firestore=t,this._commitHandler=e,this._mutations=[],this._committed=!1,this._dataReader=An(t)}set(t,e,n){this._verifyNotCommitted();const s=Pe(t,this._firestore),i=mo(s.converter,e,n),o=co(this._dataReader,"WriteBatch.set",s._key,i,s.converter!==null,n);return this._mutations.push(o.toMutation(s._key,ht.none())),this}update(t,e,n,...s){this._verifyNotCommitted();const i=Pe(t,this._firestore);let o;return o=typeof(e=It(e))=="string"||e instanceof Qe?ku(this._dataReader,"WriteBatch.update",i._key,e,n,s):Nu(this._dataReader,"WriteBatch.update",i._key,e),this._mutations.push(o.toMutation(i._key,ht.exists(!0))),this}delete(t){this._verifyNotCommitted();const e=Pe(t,this._firestore);return this._mutations=this._mutations.concat(new pr(e._key,ht.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new C(R.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function Pe(r,t){if((r=It(r)).firestore!==t)throw new C(R.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class AT{constructor(t,e){this._firestore=t,this._transaction=e,this._dataReader=An(t)}get(t){const e=Pe(t,this._firestore),n=new Lu(this._firestore);return this._transaction.lookup([e._key]).then(s=>{if(!s||s.length!==1)return M(24041);const i=s[0];if(i.isFoundDocument())return new Ts(this._firestore,n,i.key,i,e.converter);if(i.isNoDocument())return new Ts(this._firestore,n,e._key,null,e.converter);throw M(18433,{doc:i})})}set(t,e,n){const s=Pe(t,this._firestore),i=mo(s.converter,e,n),o=co(this._dataReader,"Transaction.set",s._key,i,s.converter!==null,n);return this._transaction.set(s._key,o),this}update(t,e,n,...s){const i=Pe(t,this._firestore);let o;return o=typeof(e=It(e))=="string"||e instanceof Qe?ku(this._dataReader,"Transaction.update",i._key,e,n,s):Nu(this._dataReader,"Transaction.update",i._key,e),this._transaction.update(i._key,o),this}delete(t){const e=Pe(t,this._firestore);return this._transaction.delete(e._key),this}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xm extends AT{constructor(t,e){super(t,e),this._firestore=t}get(t){const e=Pe(t,this._firestore),n=new He(this._firestore);return super.get(t).then(s=>new zt(this._firestore,n,e._key,s._document,new le(!1,!1),e.converter))}}function bT(r,t,e){r=W(r,st);const n=Object.assign(Object.assign({},wT),e);return function(i){if(i.maxAttempts<1)throw new C(R.INVALID_ARGUMENT,"Max attempts must be at least 1")}(n),function(i,o,u){const c=new At;return i.asyncQueue.enqueueAndForget(async()=>{const h=await rm(i);new nE(i.asyncQueue,h,u,o,c).zu()}),c.promise}(dt(r),s=>t(new xm(r,s)),n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function RT(){return new xs("deleteField")}function ST(){return new Vu("serverTimestamp")}function PT(...r){return new Cu("arrayUnion",r)}function VT(...r){return new Du("arrayRemove",r)}function CT(r){return new xu("increment",r)}function DT(r){return new Wt(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xT(r){return dt(r=W(r,st)),new Dm(r,t=>wr(r,t))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function NT(r,t){const e=dt(r=W(r,st));if(!e._uninitializedComponentsProvider||e._uninitializedComponentsProvider._offline.kind==="memory")return Ft("Cannot enable indexes when persistence is disabled"),Promise.resolve();const n=function(i){const o=typeof i=="string"?function(h){try{return JSON.parse(h)}catch(f){throw new C(R.INVALID_ARGUMENT,"Failed to parse JSON: "+f?.message)}}(i):i,u=[];if(Array.isArray(o.indexes))for(const c of o.indexes){const h=Th(c,"collectionGroup"),f=[];if(Array.isArray(c.fields))for(const m of c.fields){const g=lo("setIndexConfiguration",Th(m,"fieldPath"));m.arrayConfig==="CONTAINS"?f.push(new ln(g,2)):m.order==="ASCENDING"?f.push(new ln(g,0)):m.order==="DESCENDING"&&f.push(new ln(g,1))}u.push(new Kn(Kn.UNKNOWN_ID,h,f,Qn.empty()))}return u}(t);return dE(e,n)}function Th(r,t){if(typeof r[t]!="string")throw new C(R.INVALID_ARGUMENT,"Missing string value for: "+t);return r[t]}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nm{constructor(t){this._firestore=t,this.type="PersistentCacheIndexManager"}}function kT(r){var t;r=W(r,st);const e=vh.get(r);if(e)return e;if(((t=dt(r)._uninitializedComponentsProvider)===null||t===void 0?void 0:t._offline.kind)!=="persistent")return null;const n=new Nm(r);return vh.set(r,n),n}function OT(r){km(r,!0)}function FT(r){km(r,!1)}function MT(r){mE(dt(r._firestore)).then(t=>N("deleting all persistent cache indexes succeeded")).catch(t=>Ft("deleting all persistent cache indexes failed",t))}function km(r,t){fE(dt(r._firestore),t).then(e=>N(`setting persistent cache index auto creation isEnabled=${t} succeeded`)).catch(e=>Ft(`setting persistent cache index auto creation isEnabled=${t} failed`,e))}const vh=new WeakMap;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function LT(r){var t;const e=(t=dt(W(r.firestore,st))._onlineComponents)===null||t===void 0?void 0:t.datastore.serializer;return e===void 0?null:Zi(e,Ot(r._query)).Vt}function BT(r,t){var e;const n=fd(t,(i,o)=>new Wd(o,i.aggregateType,i._internalFieldPath)),s=(e=dt(W(r.firestore,st))._onlineComponents)===null||e===void 0?void 0:e.datastore.serializer;return s===void 0?null:of(s,xd(r._query),n,!0).request}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class UT{constructor(){throw new Error("instances of this class should not be created")}static onExistenceFilterMismatch(t){return Uu.instance.onExistenceFilterMismatch(t)}}class Uu{constructor(){this.Fc=new Map}static get instance(){return ui||(ui=new Uu,function(e){if(Vi)throw new Error("a TestingHooksSpi instance is already set");Vi=e}(ui)),ui}ct(t){this.Fc.forEach(e=>e(t))}onExistenceFilterMismatch(t){const e=Symbol(),n=this.Fc;return n.set(e,t),()=>n.delete(e)}}let ui=null;(function(t,e=!0){(function(s){dr=s})(Mg),vi(new as("firestore",(n,{instanceIdentifier:s,options:i})=>{const o=n.getProvider("app").getImmediate(),u=new st(new Zg(n.getProvider("auth-internal")),new n_(o,n.getProvider("app-check-internal")),function(h,f){if(!Object.prototype.hasOwnProperty.apply(h.options,["projectId"]))throw new C(R.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Oe(h.options.projectId,f)}(o,s),o);return i=Object.assign({useFetchStreams:e},i),u._setSettings(i),u},"PUBLIC").setMultipleInstances(!0)),Jr(Zc,tl,t),Jr(Zc,tl,"esm2017")})();const ZT=Object.freeze(Object.defineProperty({__proto__:null,AbstractUserDataWriter:Mu,AggregateField:lr,AggregateQuerySnapshot:pm,Bytes:Bt,CACHE_SIZE_UNLIMITED:yE,CollectionReference:Jt,DocumentReference:nt,DocumentSnapshot:zt,FieldPath:Qe,FieldValue:We,Firestore:st,FirestoreError:C,GeoPoint:Yt,LoadBundleTask:hm,PersistentCacheIndexManager:Nm,Query:Et,QueryCompositeFilterConstraint:Rn,QueryConstraint:Tr,QueryDocumentSnapshot:os,QueryEndAtConstraint:Os,QueryFieldFilterConstraint:vr,QueryLimitConstraint:Ns,QueryOrderByConstraint:fo,QuerySnapshot:$t,QueryStartAtConstraint:ks,SnapshotMetadata:le,Timestamp:Z,Transaction:xm,VectorValue:Wt,WriteBatch:Dm,_AutoId:qi,_ByteString:ft,_DatabaseId:Oe,_DocumentKey:k,_EmptyAppCheckTokenProvider:r_,_EmptyAuthCredentialsProvider:Kh,_FieldPath:ct,_TestingHooks:UT,_cast:W,_debugAssert:Jg,_internalAggregationQueryToProtoRunAggregationQueryRequest:BT,_internalQueryToProtoQueryTarget:LT,_isBase64Available:B_,_logWarn:Ft,_validateIsNotUsedTogether:Wh,addDoc:uT,aggregateFieldEqual:QE,aggregateQuerySnapshotEqual:WE,and:ME,arrayRemove:VT,arrayUnion:PT,average:KE,clearIndexedDbPersistence:wE,collection:pE,collectionGroup:gE,connectFirestoreEmulator:cm,count:Sm,deleteAllPersistentCacheIndexes:MT,deleteDoc:aT,deleteField:RT,disableNetwork:RE,disablePersistentCacheIndexAutoCreation:FT,doc:lm,documentId:PE,documentSnapshotFromJSON:HE,enableIndexedDbPersistence:TE,enableMultiTabIndexedDbPersistence:vE,enableNetwork:bE,enablePersistentCacheIndexAutoCreation:OT,endAt:$E,endBefore:zE,ensureFirestoreConfigured:dt,executeWrite:wr,getAggregateFromServer:Vm,getCountFromServer:hT,getDoc:ZE,getDocFromCache:tT,getDocFromServer:eT,getDocs:nT,getDocsFromCache:rT,getDocsFromServer:sT,getFirestore:EE,getPersistentCacheIndexManager:kT,increment:CT,initializeFirestore:IE,limit:BE,limitToLast:UE,loadBundle:Va,memoryEagerGarbageCollector:gT,memoryLocalCache:yT,memoryLruGarbageCollector:_T,namedQuery:mm,onSnapshot:Ca,onSnapshotResume:cT,onSnapshotsInSync:lT,or:FE,orderBy:LE,persistentLocalCache:IT,persistentMultipleTabManager:vT,persistentSingleTabManager:Cm,query:kE,queryEqual:Pu,querySnapshotFromJSON:XE,refEqual:_E,runTransaction:bT,serverTimestamp:ST,setDoc:iT,setIndexConfiguration:NT,setLogLevel:Xg,snapshotEqual:YE,startAfter:jE,startAt:qE,sum:GE,terminate:SE,updateDoc:oT,vector:DT,waitForPendingWrites:AE,where:OE,writeBatch:xT},Symbol.toStringTag,{value:"Module"}));export{vi as A,JT as B,as as C,bp as D,xh as E,hr as F,Sp as G,EE as H,Lg as I,Ca as J,lm as K,Nh as L,eT as M,ZE as N,iT as O,aT as P,oT as Q,xT as R,Mg as S,Z as T,uT as U,RT as V,ZT as W,kg as _,Bg as a,It as b,pE as c,xa as d,qT as e,Ap as f,nT as g,Ne as h,Ui as i,HT as j,XT as k,zn as l,KT as m,QT as n,WT as o,Sh as p,kE as q,Jr as r,jT as s,GT as t,Cp as u,J as v,OE as w,$T as x,Ep as y,zT as z};
