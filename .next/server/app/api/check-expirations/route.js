(()=>{var e={};e.id=5731,e.ids=[5731],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11997:e=>{"use strict";e.exports=require("punycode")},12412:e=>{"use strict";e.exports=require("assert")},21289:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>g,routeModule:()=>c,serverHooks:()=>x,workAsyncStorage:()=>u,workUnitAsyncStorage:()=>f});var s={};r.r(s),r.d(s,{POST:()=>d});var i=r(96559),o=r(48088),a=r(37719),n=r(61223),p=r(44999),l=r(99416);async function d(){try{let e=(0,p.UL)(),t=(0,n.createRouteHandlerClient)({cookies:()=>e}),r=new Date,{data:s,error:i}=await t.from("jobs").select(`
        id,
        title,
        created_at,
        employer_id,
        profiles!inner(email, plan_type)
      `).eq("status","active").eq("profiles.plan_type","free");if(i)return console.error("Error fetching jobs:",i),Response.json({error:"Database error"},{status:500});let o=0;for(let e of s||[]){let t=new Date(e.created_at),s=Math.floor((r-t)/864e5),i=30-s;(7===i||1===i)&&(await (0,l.sendJobExpirationWarning)(e.profiles.email,e.title,i),o++,console.log(`📧 Warning sent: ${e.title} expires in ${i} days`))}return Response.json({success:!0,message:`Sent ${o} expiration warnings`,emailsSent:o})}catch(e){return console.error("Error in expiration check:",e),Response.json({error:"Server error"},{status:500})}}let c=new i.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/check-expirations/route",pathname:"/api/check-expirations",filename:"route",bundlePath:"app/api/check-expirations/route"},resolvedPagePath:"/Users/mattiebrooke/fieldjobs-website/app/api/check-expirations/route.js",nextConfigOutput:"",userland:s}),{workAsyncStorage:u,workUnitAsyncStorage:f,serverHooks:x}=c;function g(){return(0,a.patchFetch)({workAsyncStorage:u,workUnitAsyncStorage:f})}},21820:e=>{"use strict";e.exports=require("os")},27910:e=>{"use strict";e.exports=require("stream")},28354:e=>{"use strict";e.exports=require("util")},29021:e=>{"use strict";e.exports=require("fs")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:e=>{"use strict";e.exports=require("path")},34631:e=>{"use strict";e.exports=require("tls")},39727:()=>{},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},47990:()=>{},55511:e=>{"use strict";e.exports=require("crypto")},55591:e=>{"use strict";e.exports=require("https")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},81630:e=>{"use strict";e.exports=require("http")},83997:e=>{"use strict";e.exports=require("tty")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{},99416:(e,t,r)=>{"use strict";let s=r(75024);async function i({to:e,subject:t,html:r,from:i=process.env.SENDGRID_FROM_EMAIL||"noreply@field-jobs.co",replyTo:o="support@field-jobs.co"}){try{if(!process.env.SENDGRID_API_KEY)return console.log("SendGrid not configured, email would be sent:",{to:e,subject:t}),{success:!0,message:"Email logged (SendGrid not configured)"};return await s.send({to:e,from:i,replyTo:o,subject:t,html:r}),console.log("Email sent successfully to:",e),{success:!0,message:"Email sent successfully"}}catch(e){return console.error("Email send failed:",e),{success:!1,error:e instanceof Error?e.message:"Unknown error"}}}process.env.SENDGRID_API_KEY&&s.setApiKey(process.env.SENDGRID_API_KEY),e.exports={sendEmail:i,emailTemplates:{welcome:e=>({subject:"Welcome to FieldJobs! \uD83C\uDF89",html:`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">⚙️ FieldJobs</h1>
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
          <h2>Contact Details:</h2>
          <p><strong>Name:</strong> ${e}</p>
          <p><strong>Email:</strong> ${t}</p>
          <p><strong>Subject:</strong> ${r}</p>
          
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
    `})}}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[4243,131,1330,5024],()=>r(21289));module.exports=s})();