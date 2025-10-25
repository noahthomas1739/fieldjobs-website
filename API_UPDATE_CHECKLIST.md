# API Update Checklist - Standardize to user_id

## ✅ **ALREADY CORRECT** (No changes needed)
- `app/api/applications/route.js` - Uses `applicant_id` correctly
- `app/api/saved-jobs/route.js` - Uses `applicant_id` correctly  
- `app/api/applied-jobs/route.js` - Uses `applicant_id` correctly
- `app/api/job-analytics/route.js` - Uses `user_id` correctly
- `app/api/track-job-view/route.js` - Uses `user_id` correctly

## 🔧 **NEEDS UPDATING** (employer_id → user_id)

### 1. **app/api/applications/route.js**
- Line 13: `employer_id` → `user_id`
- Line 109: `employer_id` → `user_id` 
- Line 135: `employer_id` → `user_id`
- Line 212: `employer_id` → `user_id`
- Line 276: `employer_id` → `user_id`
- Line 290: `employer_id` → `user_id`
- Line 367: `employer_id` → `user_id`
- Line 387: `employer_id` → `user_id`

### 2. **app/api/send-application-emails/route.ts**
- ✅ Already fixed: `employer_id` → `user_id`

### 3. **lib/database.js**
- Line 83: `employer_id` → `user_id`

### 4. **app/api/stripe/manage-subscription/route.js**
- Line 369: `employer_id` → `user_id`

### 5. **app/api/view-resume/route.js**
- Line 27: `user_id` → `user_id` (already correct)
- Line 41: `employer_id` → `user_id`
- Line 69: `employer_id` → `user_id`

### 6. **app/api/stripe/webhook/route.js**
- Line 244: `user_id` (already correct)

## 🎯 **IMPLEMENTATION STRATEGY**

### Phase 1: Database Migration
1. Run `STANDARDIZE_USER_IDS.sql` in Supabase
2. Verify all data migrated correctly
3. Test that existing functionality still works

### Phase 2: API Updates
1. Update all APIs to use `user_id` instead of `employer_id`
2. Test each API endpoint
3. Update frontend code if needed

### Phase 3: Cleanup (Optional)
1. Remove `employer_id` column from jobs table
2. Remove backward compatibility view
3. Update documentation

## 🧪 **TESTING CHECKLIST**

After migration, test these scenarios:
- [ ] Job posting (employer creates job)
- [ ] Job viewing (job seeker views job)
- [ ] Job application (job seeker applies)
- [ ] Application management (employer views applications)
- [ ] Analytics (employer views job analytics)
- [ ] Email notifications (application confirmations)
- [ ] Resume viewing (employer views applicant resume)

## 🚨 **ROLLBACK PLAN**

If issues occur:
1. Revert API changes
2. Use the backward compatibility view
3. Gradually fix issues and re-deploy

## 📊 **BENEFITS**

- ✅ **Consistency**: All user references use `user_id`
- ✅ **Clarity**: No more `employer_id` vs `user_id` confusion
- ✅ **Maintainability**: Easier to understand and debug
- ✅ **Supabase Alignment**: Follows Supabase conventions
- ✅ **Future-proof**: Ready for new features
