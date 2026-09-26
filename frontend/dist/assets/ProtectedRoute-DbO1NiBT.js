import{r as d,j as h,N as g}from"./index-Bq77-bgQ.js";import{o as b,a as m}from"./firebase-CqvR6sUO.js";import"./index.esm-DnAijM8W.js";/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */function w(t,i,r,u){function a(e){return e instanceof r?e:new r(function(s){s(e)})}return new(r||(r=Promise))(function(e,s){function c(o){try{n(u.next(o))}catch(f){s(f)}}function l(o){try{n(u.throw(o))}catch(f){s(f)}}function n(o){o.done?e(o.value):a(o.value).then(c,l)}n((u=u.apply(t,[])).next())})}function x(t,i){var r={label:0,sent:function(){if(e[0]&1)throw e[1];return e[1]},trys:[],ops:[]},u,a,e,s;return s={next:c(0),throw:c(1),return:c(2)},typeof Symbol=="function"&&(s[Symbol.iterator]=function(){return this}),s;function c(n){return function(o){return l([n,o])}}function l(n){if(u)throw new TypeError("Generator is already executing.");for(;r;)try{if(u=1,a&&(e=n[0]&2?a.return:n[0]?a.throw||((e=a.return)&&e.call(a),0):a.next)&&!(e=e.call(a,n[1])).done)return e;switch(a=0,e&&(n=[n[0]&2,e.value]),n[0]){case 0:case 1:e=n;break;case 4:return r.label++,{value:n[1],done:!1};case 5:r.label++,a=n[1],n=[0];continue;case 7:n=r.ops.pop(),r.trys.pop();continue;default:if(e=r.trys,!(e=e.length>0&&e[e.length-1])&&(n[0]===6||n[0]===2)){r=0;continue}if(n[0]===3&&(!e||n[1]>e[0]&&n[1]<e[3])){r.label=n[1];break}if(n[0]===6&&r.label<e[1]){r.label=e[1],e=n;break}if(e&&r.label<e[2]){r.label=e[2],r.ops.push(n);break}e[2]&&r.ops.pop(),r.trys.pop();continue}n=i.call(t,r)}catch(o){n=[6,o],a=0}finally{u=e=0}if(n[0]&5)throw n[1];return{value:n[0]?n[1]:void 0,done:!0}}}/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */var v=function(){return v=Object.assign||function(i){for(var r,u=1,a=arguments.length;u<a;u++){r=arguments[u];for(var e in r)Object.prototype.hasOwnProperty.call(r,e)&&(i[e]=r[e])}return i},v.apply(this,arguments)},y=function(t){return{loading:t==null,value:t}},p=function(){return function(t,i){switch(i.type){case"error":return v(v({},t),{error:i.error,loading:!1,value:void 0});case"reset":return y(i.defaultValue);case"value":return v(v({},t),{error:void 0,loading:!1,value:i.value});default:return t}}},_=function(t){var i=t?t():void 0,r=d.useReducer(p(),y(i)),u=r[0],a=r[1],e=d.useCallback(function(){var l=t?t():void 0;a({type:"reset",defaultValue:l})},[t]),s=d.useCallback(function(l){a({type:"error",error:l})},[]),c=d.useCallback(function(l){a({type:"value",value:l})},[]);return d.useMemo(function(){return{error:u.error,loading:u.loading,reset:e,setError:s,setValue:c,value:u.value}},[u.error,u.loading,e,s,c,u.value])},E=function(t,i){var r=_(function(){return t.currentUser}),u=r.error,a=r.loading,e=r.setError,s=r.setValue,c=r.value;return d.useEffect(function(){var l=b(t,function(n){return w(void 0,void 0,void 0,function(){var o;return x(this,function(f){switch(f.label){case 0:return[3,4];case 1:return f.trys.push([1,3,,4]),[4,i.onUserChanged(n)];case 2:return f.sent(),[3,4];case 3:return o=f.sent(),e(o),[3,4];case 4:return s(n),[2]}})})},e);return function(){l()}},[t]),[c,a,u]};function S({children:t}){const[i,r]=E(m);return r?h.jsx("div",{children:"Carregando..."}):i?h.jsx(h.Fragment,{children:t}):h.jsx(g,{to:"/login",replace:!0})}export{S as ProtectedRoute};
