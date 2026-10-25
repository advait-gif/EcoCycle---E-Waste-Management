EcoCycle Website Page Definitions 

# EcoCycle Website Page Definitions 

**Scope:** every page of the EcoCycle website, with its URL, who can open it, its purpose, and what it contains. Website only: everything runs in the browser, on phone, tablet and desktop. No native apps in v1. 

## 1. Website Structure 

The website has five areas behind one login. After login, each person is sent to the area for their role. 

|Area|URL prefix|Who can open<br>it|Layout priority|
|---|---|---|---|
|Public site|/|Anyone|Phone and desktop|
|Authentication|/signup, /login and<br>related|Anyone, logged<br>out|Phone and desktop|
|Customer area|/customer|Customers|Phone first|
|Collector area|/collector|Verified<br>collectors|Phone first|
|Recycler area|/recycler|Verified<br>recyclers|Desktop first, works on phone<br>and tablet|
|Admin area|/admin|EcoCycle staff|Desktop first, read and approve<br>tasks work on tablet|



#### **Access rules for every page** 

- Public pages need no login. 

- Role areas redirect to /login when logged out, and to a no-access page when the role does not match. 

- Collector and recycler pages (other than onboarding and status) open only after admin verification. 

- Admin pages always require two-factor sign-in. 

Page 1 of 14 

EcoCycle Website Page Definitions 

## 2. Public Pages 

Page 2 of 14 

EcoCycle Website Page Definitions 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Landing|/|Explain EcoCycle and<br>push the first booking|Short description, 3-step<br>how-it-works, main button<br>"Book a pickup", links for<br>collectors and recyclers,<br>trust strip, footer|
|How it works|/how-it-works|Explain the full journey|Customer steps, role of<br>collectors and recyclers, how<br>points are earned|
|What we<br>accept|/what-we-<br>accept|Set expectations before<br>booking|Accepted categories with<br>examples, prohibited and<br>restricted items, battery<br>safety note|
|Rewards info|/rewards-info|Explain points|How points are earned, when<br>they are credited, reward<br>store coming soon|
|Verified<br>recyclers|/verified-<br>recyclers|Build trust|Partner list with city and<br>authorization status|
|Become a<br>collector|/become-a-<br>collector|Recruit collectors|Benefits, requirements,<br>documents needed, button<br>to collector sign-up|
|Become a<br>recycler|/become-a-<br>recycler|Recruit recyclers|Benefits, requirements,<br>documents needed, button<br>to recycler sign-up|
|FAQ|/faq|Answer common<br>questions|Grouped questions for<br>customers, collectors and<br>recyclers|
|Contact|/contact|Reach support|Contact form, support email<br>and phone, grievance contact|
|Terms|/terms|Legal|Terms of service|
|Privacy|/privacy|Legal|Privacy policy and data<br>handling|
|Rewards|/rewards-|Legal|Earning, expiry, reversal and|
|terms|terms||liability rules for points|



Page 3 of 14 

EcoCycle Website Page Definitions 

## 3. Authentication Pages 

Page 4 of 14 

EcoCycle Website Page Definitions 

|Page|URL|Access|Purpose|Contains|
|---|---|---|---|---|
|Sign up|/signup|Logged out|Create an<br>account|Step 1 role choice<br>(Customer, Collector,<br>Recycler); step 2 name,<br>mobile, email, password<br>with strength hint,<br>consent to terms and<br>privacy; step 3 goes to<br>OTP|
|Login|/login|Logged out|Sign in|Email or mobile with<br>password, "Login with<br>OTP" option, forgot<br>password link, Google<br>sign-in for customers<br>only, errors for wrong<br>details, unverified and<br>locked accounts|
|OTP<br>verification|/verify-otp|Mid sign-up or<br>login|Confirm<br>mobile and<br>email|6-digit code, resend<br>timer, attempt limit<br>message, change<br>number or email|
|Forgot<br>password|/forgot-<br>password|Logged out|Start reset|Email or mobile field,<br>neutral confirmation<br>message that does not<br>reveal whether the<br>account exists|
|Reset<br>password|/reset-<br>password|Reset link or<br>code|Set a new<br>password|New password and<br>confirm, expiry<br>message, success state|
|Two-factor|/two-factor|Mid login|Second step|Authenticator code,<br>recovery code option.<br>Required for Admin and<br>Recycler, optional for<br>others|
|Admin login|/admin/login|Logged out,<br>not linked<br>from the site|Staff sign in|Email and password,<br>then two-factor|



Page 5 of 14 

EcoCycle Website Page Definitions 

**Role router (no page of its own).** After login the user is sent to /customer, /collector, /recycler or /admin. Unverified collectors and recyclers go to their status page instead. 

### Account status pages 

|Page|URL|Shown when|Contains|
|---|---|---|---|
|Verification<br>pending|/collector/status,<br>/recycler/status|Documents<br>submitted, not yet<br>approved|What happens next,<br>expected review time,<br>edit submitted details|
|Verification<br>rejected|same URLs|Admin rejected or<br>asked for more<br>information|Reason, list of items to<br>fix, resubmit button|
|Account<br>suspended|/suspended|Admin suspended the<br>account|Reason category,<br>support contact|
|Session<br>expired|/session-expired|Login timed out|Message and login<br>button that returns to<br>the previous page|



## 4. Customer Area Pages 

All under /customer. Access: logged-in customers. 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Home|/customer|Starting point|Active pickup card with live<br>status, "Book a pickup"<br>button, points balance,<br>recent pickups. First-time<br>empty state with a guided<br>prompt|



Page 6 of 14 

EcoCycle Website Page Definitions 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Book pickup|/customer/book|Create a<br>request|5 steps: address with map<br>pin and landmark, items<br>(category, quantity,<br>estimated weight,<br>prohibited item warning,<br>data-wipe<br>acknowledgement),<br>photos, date and time slot,<br>review and confirm.<br>Progress is saved. Ends<br>with a confirmation screen|
|My pickups|/customer/pickups|Find past and<br>current<br>pickups|List with status filters and<br>search|
|Pickup details<br>and tracking|/customer/pickups/:id|Follow one<br>pickup|Status timeline, collector<br>card, map and ETA while<br>travelling, handover code,<br>call or message through<br>masked number, cancel<br>until the collector arrives,<br>report problem, final<br>weights, recycler name,<br>points earned, rating form<br>after completion|
|Rewards|/customer/rewards|Show points|Balance, ledger of credits,<br>reversals and adjustments<br>with linked pickup, how<br>points work, "store coming<br>soon" panel|
|Addresses|/customer/addresses|Manage<br>addresses|List, add, edit, delete, set<br>default|
|Notifications|/customer/notifications|Updates|List with read and unread<br>state, tap opens the related<br>pickup|
|Profile and<br>settings|/customer/profile|Account|Personal details,<br>notification preferences,<br>language, security settings,<br>delete account request|



Page 7 of 14 

EcoCycle Website Page Definitions 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Help and<br>complaints|/customer/help|Support|FAQ, raise a complaint<br>linked to a pickup,<br>complaint list with status<br>and replies|



**Pickup states the details page must show:** searching for collector, collector found, on the way, arrived, collected, delivered to recycler, completed, cancelled, no collector found (retry or reschedule), failed pickup. 

## 5. Collector Area Pages 

All under /collector. Access: collectors; main pages open only once verified. 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Onboarding|/collector/onboarding|Apply to join|Wizard: personal details,<br>ID upload, selfie, vehicle,<br>service area and radius,<br>payout details, collector<br>terms, submit. Saves<br>progress|
|Verification<br>status|/collector/status|Show review<br>result|Pending, more<br>information needed, or<br>rejected with reasons<br>and resubmit|
|Dashboard|/collector|Daily home|Online and offline<br>switch, today's earnings,<br>jobs done today, active<br>job card, links to offers<br>and batches|
|Job offers|/collector/offers|Pick up work|Nearby requests with<br>distance, area, item<br>summary, estimated<br>weight, countdown<br>timer, Accept and<br>Decline. Empty state,<br>and a message if another<br>collector took the job|



Page 8 of 14 

EcoCycle Website Page Definitions 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Active job|/collector/jobs/:id|Run one pickup|Customer name and<br>address, open in maps<br>link, masked call and<br>message, status buttons<br>in order (On the way,<br>Arrived, Start weighing),<br>items list, cancel or<br>report problem|
|Weighing and<br>handover|/collector/jobs/:id/weigh|Record and<br>complete<br>collection|Weight per category,<br>photo evidence, notes,<br>customer handover<br>code, summary, mark as<br>failed with reason|
|Delivery batches|/collector/batches|Group loads|Collected pickups<br>awaiting delivery, create<br>batch, choose recycler,<br>total weight|
|Batch details|/collector/batches/:id|Track one<br>delivery|Pickups in the batch,<br>recycler, status, recycler<br>confirmation and any<br>weight mismatch|
|Earnings and<br>payouts|/collector/earnings|Money view|Earnings per job,<br>pending and paid, payout<br>history, date filter|
|Ratings and<br>performance|/collector/ratings|Quality view|Average rating, recent<br>reviews, acceptance and<br>completion rates|
|Profile|/collector/profile|Account|Personal and vehicle<br>details, documents with<br>expiry dates, payout<br>details, security settings|
|Help|/collector/help|Support|Support contact, safety<br>rules, prohibited items|



Page 9 of 14 

EcoCycle Website Page Definitions 

## 6. Recycler Area Pages 

All under /recycler. Access: recyclers; main pages open only once verified. Two-factor required. 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Onboarding|/recycler/onboarding|Apply to join|Facility details, authorization<br>and registration documents,<br>GST and PAN, capacity,<br>accepted categories, contact<br>persons|
|Verification<br>status|/recycler/status|Show review<br>result|Pending, more information<br>needed or rejected with<br>reasons. After approval, shows<br>document expiry warnings|
|Dashboard|/recycler|Daily home|Deliveries waiting, today's<br>received weight, inventory<br>snapshot, alerts (expiring<br>document, flagged delivery)|
|Incoming<br>deliveries|/recycler/deliveries|See what is<br>arriving|Table with collector, expected<br>weight and status, with filters<br>and search|
|Receive and<br>verify|/recycler/deliveries/:id|Confirm a<br>delivery|Collector details, expected<br>weights, received weight per<br>category, photos, Accept,<br>Partially accept or Reject with<br>reason, mismatch warning that<br>opens a dispute|
|Inventory|/recycler/inventory|Track stock|Stock by category and status<br>(Received, Sorted, In<br>processing, Processed), status<br>update actions|
|Processing<br>records|/recycler/processing|Record<br>outputs|Create processing batch from<br>inventory, record material<br>outputs, upload processing<br>documents, history|
|Reports|/recycler/reports|Review<br>activity|Intake by period, category and<br>collector, CSV export|



Page 10 of 14 

EcoCycle Website Page Definitions 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Rate card|/recycler/rates|See rates|Per-kg rates by category, read<br>only|
|Profile|/recycler/profile|Account|Facility details, documents<br>with expiry, security settings<br>with two-factor|



## 7. Admin Area Pages 

All under /admin. Access: staff only, two-factor required. Built for desktop; works on tablet for reading and approving. 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Overview|/admin|Operations at a<br>glance|KPI cards, pickup funnel,<br>live map, alerts for stuck<br>pickups and expiring<br>documents|
|Verification<br>queue|/admin/verifications|Review applicants|Tabs for collectors and<br>recyclers, oldest first|
|Verification<br>details|/admin/verifications/:id|Decide on one<br>applicant|Document viewer,<br>applicant details,<br>Approve, Reject,<br>Request more<br>information, Suspend,<br>with required note|
|Pickups|/admin/pickups|Monitor pickups|Table filtered by status,<br>area, collector and date|
|Pickup details|/admin/pickups/:id|Inspect and<br>intervene|Full timeline, weights at<br>each stage, photos,<br>location trail, reassign,<br>cancel or force-<br>complete with reason|
|Disputes|/admin/disputes|Handle<br>complaints|Queue with SLA timers|



Page 11 of 14 

EcoCycle Website Page Definitions 

|Page|URL|Purpose|Contains|
|---|---|---|---|
|Dispute details|/admin/disputes/:id|Resolve one case|Evidence timeline,<br>parties, resolution form<br>(points reversal,<br>collector penalty,<br>recycler flag, no action)|
|Users|/admin/users|Manage accounts|Tabs for customers,<br>collectors and recyclers,<br>search|
|User details|/admin/users/:id|Inspect one<br>account|Profile, history, suspend<br>or reactivate, notes|
|Rewards<br>administration|/admin/rewards|Control points|Points per category,<br>manual adjustment and<br>reversal with reason,<br>ledger search, fraud<br>flags|
|Settings|/admin/settings|Configure the<br>marketplace|Categories, per-kg<br>rates, service areas,<br>dispatch rules,<br>prohibited items,<br>notification templates,<br>legal page content|
|Analytics|/admin/analytics|Measure|Pickups over time,<br>weight by category,<br>funnel, collector and<br>recycler performance,<br>points issued, date<br>filters, CSV export|
|Audit log|/admin/audit-log|Accountability|Searchable read-only<br>list of sensitive actions<br>with actor, time and<br>changes|



## 8. System Pages 

|Page|When shown|Contains|
|---|---|---|
|Not found (404)|URL does not exist|Message and link home|



Page 12 of 14 

EcoCycle Website Page Definitions 

|Page|When shown|Contains|
|---|---|---|
|No access (403)|Role does not match the<br>area|Message and link to the user's own area|
|Server error<br>(500)|Unexpected failure|Message, retry, support link|
|Maintenance|Planned downtime|Message and expected return time|
|Offline notice|Connection lost|Banner with retry; failed submissions can<br>be resent without duplicates|



## 9. Shared Website Elements 

These appear on many pages and behave the same everywhere. 

- **Header and navigation:** top bar on public pages; side navigation on desktop and bottom navigation on phones for the customer and collector areas; sidebar for the recycler and admin areas. 

- **Notification bell** with unread count in every logged-in area. 

- **Language switch:** English and Hindi. 

- **Profile menu:** profile, security settings, log out. 

- **Map block** with pin selection and live marker, and a fallback message if location is blocked. 

- **File upload** with preview, progress, and type and size errors. 

- **Data tables** with sort, filter, pagination and CSV export in recycler and admin areas. 

- **Status badges** for pickups, verifications, disputes and payouts. 

- **Confirmation dialogs** before cancelling, rejecting, suspending or overriding. 

- **Permission prompts** for location and notifications, with a short explanation before the browser asks. 

- **Footer** with legal links and contact on public pages. 

## 10. Page Count 

|Area|Pages|
|---|---|
|Public|12|
|Authentication and status|11|



Page 13 of 14 

EcoCycle Website Page Definitions 

|Area|Pages|
|---|---|
|Customer|9|
|Collector|12|
|Recycler|10|
|Admin|13|
|System|5|
|**Total**|**72**|



## 11. Assumptions to Confirm 

1. Customers can log in with a password or an OTP. 

2. One shared login page for all roles; admin has its own hidden login URL. 

3. Google sign-in is for customers only. 

4. Admin is desktop first. It works on tablet for reading and approving but is not designed for phones. Tell me if admin must work fully on phones. 

5. English and Hindi at launch. 

6. Reward store is a coming-soon panel in v1. 

7. Recycler rate card is read only in v1. 

8. No customer and collector chat; masked call and message are used. 

Page 14 of 14 

