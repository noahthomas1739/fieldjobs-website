(()=>{var e={};e.id=5731,e.ids=[5731],e.modules={2502:e=>{"use strict";e.exports=import("prettier/plugins/html")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11997:e=>{"use strict";e.exports=require("punycode")},21289:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>m,routeModule:()=>u,serverHooks:()=>f,workAsyncStorage:()=>p,workUnitAsyncStorage:()=>h});var s={};r.r(s),r.d(s,{POST:()=>c});var i=r(96559),n=r(48088),o=r(37719),a=r(61223),l=r(44999),d=r(99416);async function c(){try{let e=(0,l.UL)(),t=(0,a.createRouteHandlerClient)({cookies:()=>e}),r=new Date,{data:s,error:i}=await t.from("jobs").select(`
        id,
        title,
        created_at,
        employer_id,
        profiles!inner(email, plan_type)
      `).eq("status","active").eq("profiles.plan_type","free");if(i)return console.error("Error fetching jobs:",i),Response.json({error:"Database error"},{status:500});let n=0;for(let e of s||[]){let t=new Date(e.created_at),s=Math.floor((r-t)/864e5),i=30-s;(7===i||1===i)&&(await (0,d.sendJobExpirationWarning)(e.profiles.email,e.title,i),n++,console.log(`📧 Warning sent: ${e.title} expires in ${i} days`))}return Response.json({success:!0,message:`Sent ${n} expiration warnings`,emailsSent:n})}catch(e){return console.error("Error in expiration check:",e),Response.json({error:"Server error"},{status:500})}}let u=new i.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/check-expirations/route",pathname:"/api/check-expirations",filename:"route",bundlePath:"app/api/check-expirations/route"},resolvedPagePath:"/Users/mattiebrooke/fieldjobs-website/app/api/check-expirations/route.js",nextConfigOutput:"",userland:s}),{workAsyncStorage:p,workUnitAsyncStorage:h,serverHooks:f}=u;function m(){return(0,o.patchFetch)({workAsyncStorage:p,workUnitAsyncStorage:h})}},27910:e=>{"use strict";e.exports=require("stream")},28354:e=>{"use strict";e.exports=require("util")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{"use strict";e.exports=require("tls")},39727:()=>{},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},47990:()=>{},55511:e=>{"use strict";e.exports=require("crypto")},55591:e=>{"use strict";e.exports=require("https")},57075:e=>{"use strict";e.exports=require("node:stream")},59096:(e,t,r)=>{"use strict";Object.create;var s=Object.defineProperty,i=Object.defineProperties,n=Object.getOwnPropertyDescriptor,o=Object.getOwnPropertyDescriptors,a=Object.getOwnPropertyNames,l=Object.getOwnPropertySymbols,d=(Object.getPrototypeOf,Object.prototype.hasOwnProperty),c=Object.prototype.propertyIsEnumerable,u=(e,t,r)=>t in e?s(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,p=(e,t)=>{for(var r in t||(t={}))d.call(t,r)&&u(e,r,t[r]);if(l)for(var r of l(t))c.call(t,r)&&u(e,r,t[r]);return e},h=(e,t)=>i(e,o(t)),f=(e,t,r)=>new Promise((s,i)=>{var n=e=>{try{a(r.next(e))}catch(e){i(e)}},o=e=>{try{a(r.throw(e))}catch(e){i(e)}},a=e=>e.done?s(e.value):Promise.resolve(e.value).then(n,o);a((r=r.apply(e,t)).next())}),m={};((e,t)=>{for(var r in t)s(e,r,{get:t[r],enumerable:!0})})(m,{Resend:()=>A}),e.exports=((e,t,r,i)=>{if(t&&"object"==typeof t||"function"==typeof t)for(let o of a(t))d.call(e,o)||o===r||s(e,o,{get:()=>t[o],enumerable:!(i=n(t,o))||i.enumerable});return e})(s({},"__esModule",{value:!0}),m);var y=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){return yield this.resend.post("/api-keys",e,t)})}list(){return f(this,null,function*(){return yield this.resend.get("/api-keys")})}remove(e){return f(this,null,function*(){return yield this.resend.delete(`/api-keys/${e}`)})}},g=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){return yield this.resend.post("/audiences",e,t)})}list(){return f(this,null,function*(){return yield this.resend.get("/audiences")})}get(e){return f(this,null,function*(){return yield this.resend.get(`/audiences/${e}`)})}remove(e){return f(this,null,function*(){return yield this.resend.delete(`/audiences/${e}`)})}};function b(e){var t;return{attachments:null==(t=e.attachments)?void 0:t.map(e=>({content:e.content,filename:e.filename,path:e.path,content_type:e.contentType,inline_content_id:e.inlineContentId})),bcc:e.bcc,cc:e.cc,from:e.from,headers:e.headers,html:e.html,reply_to:e.replyTo,scheduled_at:e.scheduledAt,subject:e.subject,tags:e.tags,text:e.text,to:e.to}}var x=class{constructor(e){this.resend=e}send(e){return f(this,arguments,function*(e,t={}){return this.create(e,t)})}create(e){return f(this,arguments,function*(e,t={}){let s=[];for(let t of e){if(t.react){if(!this.renderAsync)try{let{renderAsync:e}=yield Promise.all([r.e(3249),r.e(1953)]).then(r.bind(r,81953));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}t.html=yield this.renderAsync(t.react),t.react=void 0}s.push(b(t))}return yield this.resend.post("/emails/batch",s,t)})}},v=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){if(e.react){if(!this.renderAsync)try{let{renderAsync:e}=yield Promise.all([r.e(3249),r.e(1953)]).then(r.bind(r,81953));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}e.html=yield this.renderAsync(e.react)}return yield this.resend.post("/broadcasts",{name:e.name,audience_id:e.audienceId,preview_text:e.previewText,from:e.from,html:e.html,reply_to:e.replyTo,subject:e.subject,text:e.text},t)})}send(e,t){return f(this,null,function*(){return yield this.resend.post(`/broadcasts/${e}/send`,{scheduled_at:null==t?void 0:t.scheduledAt})})}list(){return f(this,null,function*(){return yield this.resend.get("/broadcasts")})}get(e){return f(this,null,function*(){return yield this.resend.get(`/broadcasts/${e}`)})}remove(e){return f(this,null,function*(){return yield this.resend.delete(`/broadcasts/${e}`)})}update(e,t){return f(this,null,function*(){return yield this.resend.patch(`/broadcasts/${e}`,{name:t.name,audience_id:t.audienceId,from:t.from,html:t.html,text:t.text,subject:t.subject,reply_to:t.replyTo,preview_text:t.previewText})})}},w=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){return yield this.resend.post(`/audiences/${e.audienceId}/contacts`,{unsubscribed:e.unsubscribed,email:e.email,first_name:e.firstName,last_name:e.lastName},t)})}list(e){return f(this,null,function*(){return yield this.resend.get(`/audiences/${e.audienceId}/contacts`)})}get(e){return f(this,null,function*(){return e.id||e.email?yield this.resend.get(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}update(e){return f(this,null,function*(){return e.id||e.email?yield this.resend.patch(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`,{unsubscribed:e.unsubscribed,first_name:e.firstName,last_name:e.lastName}):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}remove(e){return f(this,null,function*(){return e.id||e.email?yield this.resend.delete(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}},k=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){return yield this.resend.post("/domains",{name:e.name,region:e.region,custom_return_path:e.customReturnPath},t)})}list(){return f(this,null,function*(){return yield this.resend.get("/domains")})}get(e){return f(this,null,function*(){return yield this.resend.get(`/domains/${e}`)})}update(e){return f(this,null,function*(){return yield this.resend.patch(`/domains/${e.id}`,{click_tracking:e.clickTracking,open_tracking:e.openTracking,tls:e.tls})})}remove(e){return f(this,null,function*(){return yield this.resend.delete(`/domains/${e}`)})}verify(e){return f(this,null,function*(){return yield this.resend.post(`/domains/${e}/verify`)})}},_=class{constructor(e){this.resend=e}send(e){return f(this,arguments,function*(e,t={}){return this.create(e,t)})}create(e){return f(this,arguments,function*(e,t={}){if(e.react){if(!this.renderAsync)try{let{renderAsync:e}=yield Promise.all([r.e(3249),r.e(1953)]).then(r.bind(r,81953));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}e.html=yield this.renderAsync(e.react)}return yield this.resend.post("/emails",b(e),t)})}get(e){return f(this,null,function*(){return yield this.resend.get(`/emails/${e}`)})}update(e){return f(this,null,function*(){return yield this.resend.patch(`/emails/${e.id}`,{scheduled_at:e.scheduledAt})})}cancel(e){return f(this,null,function*(){return yield this.resend.post(`/emails/${e}/cancel`)})}},j="undefined"!=typeof process&&process.env&&process.env.RESEND_BASE_URL||"https://api.resend.com",$="undefined"!=typeof process&&process.env&&process.env.RESEND_USER_AGENT||"resend-node:4.8.0",A=class{constructor(e){if(this.key=e,this.apiKeys=new y(this),this.audiences=new g(this),this.batch=new x(this),this.broadcasts=new v(this),this.contacts=new w(this),this.domains=new k(this),this.emails=new _(this),!e&&("undefined"!=typeof process&&process.env&&(this.key=process.env.RESEND_API_KEY),!this.key))throw Error('Missing API key. Pass it to the constructor `new Resend("re_123")`');this.headers=new Headers({Authorization:`Bearer ${this.key}`,"User-Agent":$,"Content-Type":"application/json"})}fetchRequest(e){return f(this,arguments,function*(e,t={}){try{let r=yield fetch(`${j}${e}`,t);if(!r.ok)try{let e=yield r.text();return{data:null,error:JSON.parse(e)}}catch(t){if(t instanceof SyntaxError)return{data:null,error:{name:"application_error",message:"Internal server error. We are unable to process your request right now, please try again later."}};let e={message:r.statusText,name:"application_error"};if(t instanceof Error)return{data:null,error:h(p({},e),{message:t.message})};return{data:null,error:e}}return{data:yield r.json(),error:null}}catch(e){return{data:null,error:{name:"application_error",message:"Unable to fetch data. The request could not be resolved."}}}})}post(e,t){return f(this,arguments,function*(e,t,r={}){let s=new Headers(this.headers);r.idempotencyKey&&s.set("Idempotency-Key",r.idempotencyKey);let i=p({method:"POST",headers:s,body:JSON.stringify(t)},r);return this.fetchRequest(e,i)})}get(e){return f(this,arguments,function*(e,t={}){let r=p({method:"GET",headers:this.headers},t);return this.fetchRequest(e,r)})}put(e,t){return f(this,arguments,function*(e,t,r={}){let s=p({method:"PUT",headers:this.headers,body:JSON.stringify(t)},r);return this.fetchRequest(e,s)})}patch(e,t){return f(this,arguments,function*(e,t,r={}){let s=p({method:"PATCH",headers:this.headers,body:JSON.stringify(t)},r);return this.fetchRequest(e,s)})}delete(e,t){return f(this,null,function*(){let r={method:"DELETE",headers:this.headers,body:JSON.stringify(t)};return this.fetchRequest(e,r)})}}},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},81630:e=>{"use strict";e.exports=require("http")},83505:e=>{"use strict";e.exports=import("prettier/standalone")},84297:e=>{"use strict";e.exports=require("async_hooks")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{},99416:(e,t,r)=>{"use strict";let{Resend:s}=r(59096),i=null;async function n({to:e,subject:t,html:r,from:s="noreply@field-jobs.co",replyTo:n="support@field-jobs.co"}){try{if(!i)return console.log("Resend not configured, email would be sent:",{to:e,subject:t}),{success:!0,message:"Email logged (Resend not configured)"};let{data:o,error:a}=await i.emails.send({from:s,to:e,subject:t,html:r,reply_to:n});if(a)return console.error("Resend API error:",a),{success:!1,error:a.message};return console.log("Email sent successfully to:",e,"ID:",o?.id),{success:!0,message:"Email sent successfully",id:o?.id}}catch(e){return console.error("Email send failed:",e),console.error("Error details:",{message:e.message,code:e.code}),{success:!1,error:e instanceof Error?e.message:"Unknown error"}}}process.env.Resend_API_KEY?(i=new s(process.env.Resend_API_KEY),console.log("✅ Resend API key configured")):console.log("⚠️ Resend_API_KEY not found in environment variables"),e.exports={sendEmail:n,emailTemplates:{welcome:e=>({subject:"Welcome to FieldJobs! \uD83C\uDF89",html:`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">FieldJobs</h1>
      </div>
        
        <div style="padding: 30px 20px;">
          <h2>Welcome, ${e}! 🎉</h2>
          
          <p>Thank you for joining FieldJobs, the premier platform for technical careers in energy, construction, and industrial sectors.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🚀 Get Started:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Complete your profile</li>
              <li>Upload your resume</li>
              <li>Browse available positions</li>
              <li>Set up job alerts</li>
          </ul>
        </div>
          
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://field-jobs.co/dashboard" 
               style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete Your Profile
            </a>
          </div>
          
          <p>If you have any questions, reply to this email or contact us at <a href="mailto:support@field-jobs.co">support@field-jobs.co</a>.</p>
          
          <p>Best regards,<br>The FieldJobs Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>\xa9 ${new Date().getFullYear()} FieldJobs. All rights reserved.</p>
          <p>
            <a href="https://field-jobs.co/privacy" style="color: #666;">Privacy Policy</a> | 
            <a href="https://field-jobs.co/terms" style="color: #666;">Terms of Service</a>
        </p>
      </div>
    </div>
  `}),contactForm:(e,t,r,s)=>({subject:`Contact Form: ${r}`,html:`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">📧 New Contact Form Submission</h1>
        </div>
        
        <div style="padding: 20px;">
          <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
            <h3 style="margin: 0 0 10px 0; color: #1976d2;">📧 From: ${e} (${t})</h3>
            <p style="margin: 0; font-weight: bold; color: #1976d2;">Subject: ${r}</p>
          </div>
          
          <h3>Message:</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; white-space: pre-wrap;">
${s}
          </div>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>Sent from FieldJobs contact form at ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    `}),jobApplication:(e,t,r)=>({subject:`New Application: ${e}`,html:`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">💼 New Job Application</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Application Details:</h2>
          <p><strong>Position:</strong> ${e}</p>
          <p><strong>Applicant:</strong> ${t}</p>
          <p><strong>Employer:</strong> ${r}</p>
          
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://field-jobs.co/employer" 
               style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Application
          </a>
        </div>
          
          <p style="font-size: 12px; color: #666;">
            Log in to your employer dashboard to review the full application and candidate details.
        </p>
      </div>
    </div>
  `}),passwordReset:e=>({subject:"Reset Your FieldJobs Password",html:`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">🔒 Password Reset</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2>Reset Your Password</h2>
          
          <p>You requested a password reset for your FieldJobs account. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${e}" 
               style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            This link will expire in 24 hours. If you didn't request this reset, you can safely ignore this email.
          </p>
          
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${e}</span>
          </p>
        </div>
      </div>
    `})}}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[4243,2307,3605],()=>r(21289));module.exports=s})();