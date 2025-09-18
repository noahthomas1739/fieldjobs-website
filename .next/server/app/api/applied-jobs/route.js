(()=>{var e={};e.id=9414,e.ids=[9414],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11997:e=>{"use strict";e.exports=require("punycode")},27910:e=>{"use strict";e.exports=require("stream")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{"use strict";e.exports=require("tls")},39727:()=>{},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},47990:()=>{},55511:e=>{"use strict";e.exports=require("crypto")},55591:e=>{"use strict";e.exports=require("https")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},81630:e=>{"use strict";e.exports=require("http")},91645:e=>{"use strict";e.exports=require("net")},94322:(e,r,t)=>{"use strict";t.r(r),t.d(r,{patchFetch:()=>j,routeModule:()=>c,serverHooks:()=>x,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>l});var s={};t.r(s),t.d(s,{GET:()=>u});var o=t(96559),i=t(48088),a=t(37719),p=t(61223),n=t(44999);async function u(e){try{let r=(0,n.UL)(),t=(0,p.createRouteHandlerClient)({cookies:()=>r}),{searchParams:s}=new URL(e.url),o=s.get("userId");if(!o)return Response.json({error:"User ID required"},{status:400});console.log("Fetching applied jobs for user:",o);let{data:i,error:a}=await t.from("applications").select(`
        id,
        applied_at,
        created_at,
        status,
        first_name,
        last_name,
        email,
        phone,
        classification,
        jobs (
          id,
          title,
          company,
          region,
          hourly_rate,
          job_type,
          description
        )
      `).eq("applicant_id",o).order("applied_at",{ascending:!1});if(a)return console.error("Error fetching applied jobs:",a),Response.json({error:"Failed to fetch applied jobs: "+a.message},{status:500});return console.log(`Found ${i?.length||0} applications for user ${o}`),Response.json({success:!0,appliedJobs:i||[]})}catch(e){return console.error("Server error:",e),Response.json({error:"Internal server error"},{status:500})}}let c=new o.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/applied-jobs/route",pathname:"/api/applied-jobs",filename:"route",bundlePath:"app/api/applied-jobs/route"},resolvedPagePath:"/Users/mattiebrooke/fieldjobs-website/app/api/applied-jobs/route.js",nextConfigOutput:"",userland:s}),{workAsyncStorage:d,workUnitAsyncStorage:l,serverHooks:x}=c;function j(){return(0,a.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:l})}},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[4243,131],()=>t(94322));module.exports=s})();