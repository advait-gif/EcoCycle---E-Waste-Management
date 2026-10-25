# EcoCycle Sim

# ECocycle — E-Waste Collection & Recycling Management System

## Complete Simulation-Mode Master Prompt

You are a senior software architect, UI/UX designer, full-stack engineer, database architect, QA engineer, simulation-system designer, and DevOps engineer.

Build a complete **E-Waste Collection & Recycling Management System called "EcoCycle"**.

IMPORTANT:

This is a **100% SIMULATION / DEMONSTRATION SYSTEM**.

The application must simulate the complete e-waste lifecycle without performing real-world operations.

==================================================

1. SIMULATION MODE — ABSOLUTE REQUIREMENT
   ==================================================

The entire application must operate in SIMULATION MODE.

Do NOT connect to or depend on real-world operational services.

The following must be simulated:

* pickup requests
* collection agents
* customer locations
* GPS positions
* maps
* route movement
* pickup scheduling
* e-waste weights
* collection centers
* inventory
* recycling facilities
* recycling processes
* recovered materials
* environmental impact
* reward points
* notifications
* emails
* SMS
* WhatsApp
* certificates
* reports
* payments
* coupons
* analytics
* IoT devices
* smart bins
* sensor readings
* external APIs
* external recycling organizations

The application must remain fully functional even with:

* no internet connection
* no Google Maps API
* no payment gateway
* no SMS provider
* no WhatsApp API
* no email provider
* no IoT devices
* no external recycling API

==================================================
2. SIMULATION PRINCIPLE
=======================

Every real-world action should have a simulated equivalent.

Example:

REAL WORLD:
Customer requests pickup.

SIMULATION:
Create a database pickup request and simulate the workflow.

REAL WORLD:
Agent travels to customer.

SIMULATION:
Animate the agent's simulated location moving toward the pickup location.

REAL WORLD:
Agent weighs e-waste.

SIMULATION:
Generate or enter simulated weight.

REAL WORLD:
Waste reaches recycling facility.

SIMULATION:
Move inventory into a simulated collection center.

REAL WORLD:
Recycler processes material.

SIMULATION:
Run a deterministic or configurable recycling simulation.

REAL WORLD:
Customer receives SMS.

SIMULATION:
Create an in-app simulated notification.

==================================================
3. SIMULATION BANNER
====================

Display a persistent visual indicator:

"SIMULATION MODE"

Example:

┌──────────────────────────────────────────────┐
│ 🧪 SIMULATION MODE                          │
│ All data and operations are simulated.      │
└──────────────────────────────────────────────┘

Never imply that an actual pickup, recycling operation,
payment, certificate, or environmental result has occurred.

Use terms such as:

* Simulated
* Demo
* Estimated
* Example
* Simulated Result

where appropriate.

==================================================
4. NO REAL EXTERNAL INTEGRATIONS
================================

Do NOT require API keys.

Do NOT require:

Google Maps
Mapbox
Twilio
WhatsApp
Stripe
Razorpay
SendGrid
AWS
Firebase
IoT platforms
Real recycling APIs
Real payment APIs

If such functionality is demonstrated, implement it through
local mock services.

Create interfaces so real services could theoretically be
added later, but the default implementation must always be a
simulation provider.

Example:

MapProvider
├── SimulationMapProvider
└── RealMapProvider (NOT IMPLEMENTED)

NotificationProvider
├── SimulationNotificationProvider
└── RealNotificationProvider (NOT IMPLEMENTED)

PaymentProvider
└── SimulationPaymentProvider

==================================================
5. SIMULATION ENGINE
====================

Create a dedicated simulation engine.

Suggested structure:

/lib/simulation/

simulation-engine.ts
simulation-config.ts
simulation-clock.ts
simulation-random.ts
simulation-data.ts
simulation-workflows.ts
simulation-location.ts
simulation-recycling.ts
simulation-rewards.ts
simulation-notifications.ts

The simulation engine should be responsible for generating
realistic but fictional system behavior.

==================================================
6. SIMULATION CLOCK
===================

Implement a simulated clock.

The simulation must NOT depend on real-world waiting times.

Provide controls:

▶ Start Simulation
⏸ Pause
⏩ Speed 2x
⏩ Speed 5x
⏩ Speed 10x
⏭ Advance Event
🔄 Reset Simulation

Example:

Simulation Time:
25 September 2026
10:42 AM

Simulation Speed:
5x

The system should allow an entire pickup workflow to be
completed within seconds/minutes.

==================================================
7. DEMO DATA
============

Create realistic fictional demo data.

Example customers:

Aarav Sharma
Priya Patil
Rahul Deshmukh
Sneha Joshi
Aditya Kulkarni

Example agents:

Agent A
Agent B
Agent C
Agent D

Example collection centers:

EcoCycle Center A
EcoCycle Center B
EcoCycle Center C

Example recycling partners:

GreenTech Recycler
EcoMetal Processing
RenewCycle Facility

All names and data must be clearly fictional/demo data.

==================================================
8. SIMULATED CUSTOMER
=====================

Customer can:

* register
* login
* create simulated pickup
* select fictional address
* select e-waste
* select simulated date/time
* upload simulated images or use demo images
* track simulated pickup
* view simulated recycling history
* receive simulated notifications
* earn simulated reward points
* view simulated certificates

No actual collection occurs.

==================================================
9. SIMULATED PICKUP
===================

Customer creates:

Pickup Request

Example:

Pickup ID:
SIM-PICK-000001

Items:

Laptop × 1
Mobile Phone × 2
Charger × 3

Estimated Weight:
6.5 KG

Status:

REQUESTED

The system can simulate the following:

REQUESTED
↓
CONFIRMED
↓
ASSIGNED
↓
AGENT_ACCEPTED
↓
ON_THE_WAY
↓
ARRIVED
↓
COLLECTED
↓
VERIFIED
↓
COMPLETED

Provide a button:

"Run Pickup Simulation"

When clicked, automatically progress through the workflow.

==================================================
10. SIMULATED AGENT
===================

Agents are fictional system users.

Agent dashboard:

Today's Simulated Pickups
Active Simulation
Completed Simulations
Simulated Weight Collected

Provide:

"Start Simulation"

The agent's location should move visually toward the
simulated customer location.

Example:

Depot
↓
↓
↓
Customer

Show:

Agent:
EcoAgent 01

Distance:
2.4 km

ETA:
6 minutes

IMPORTANT:

Distance and ETA are simulated values.

Display:

"Simulated GPS"

==================================================
11. SIMULATED MAP
=================

Do NOT use Google Maps or another real map provider.

Create a fictional map interface.

It may use:

* SVG
* CSS
* Canvas
* static fictional map
* grid
* fictional roads
* fictional locations

Example:

┌──────────────────────────────────────┐
│              SIM MAP                 │
│                                      │
│   ● Collection Center                │
│          │                           │
│          │                           │
│       🚚 Agent                       │
│          │                           │
│          │                           │
│                    ● Customer        │
│                                      │
└──────────────────────────────────────┘

Animate the simulated agent.

==================================================
12. SIMULATED WEIGHING
======================

When the agent verifies collected items:

Generate a simulated actual weight.

Example:

Estimated:
6.5 KG

Simulated Actual:
6.82 KG

Allow the demo user to:

* accept generated value
* manually change value
* regenerate value

Display:

"Simulated Measurement"

==================================================
13. COLLECTION CENTER SIMULATION
================================

Create simulated centers.

Each center has:

* capacity
* inventory
* incoming material
* storage
* processing queue

Example:

EcoCycle Center A

Capacity:
1,000 KG

Current simulated inventory:
642 KG

Available:
358 KG

Allow the admin to simulate:

Receive Material
Sort Material
Create Batch
Transfer Batch

==================================================
14. SIMULATED INVENTORY
=======================

Inventory records represent fictional e-waste.

Example:

SIM-INV-000001

Laptop
Weight: 2.3 KG
Condition: Refurbishable
Status: STORED

Every inventory movement must be recorded.

==================================================
15. SIMULATED SORTING
=====================

Provide a simulation action:

"Run Sorting Simulation"

Example:

Input:
100 KG

Simulation Result:

Reusable:
15 KG

Recyclable:
65 KG

Hazardous:
8 KG

Non-Recyclable:
12 KG

Ensure:

Output total = Input total

unless an explicit configurable simulation adjustment is enabled.

Label results:

"Simulated Sorting Result"

==================================================
16. SIMULATED RECYCLING BATCH
=============================

Create:

SIM-BATCH-000001

Example:

Input:
125 KG

Simulated processing:

Reusable:
15 KG

Recovered materials:
72 KG

Hazardous:
8 KG

Residual:
30 KG

Provide a visual recycling pipeline:

Collected
↓
Sorted
↓
Processed
↓
Materials Recovered
↓
Residual Disposed

Every stage is simulated.

==================================================
17. RECYCLING SIMULATION ALGORITHM
==================================

Create configurable category-based simulation factors.

Example:

Laptop:

Reusable: 10%
Recyclable: 70%
Hazardous: 5%
Residual: 15%

Mobile:

Reusable: 15%
Recyclable: 65%
Hazardous: 8%
Residual: 12%

These are simulation parameters only.

Do NOT present them as verified real-world recycling rates.

Allow administrators to modify simulation parameters.

==================================================
18. SIMULATED RECOVERED MATERIALS
=================================

Generate fictional recovery results.

Example:

Copper:
3.4 KG

Aluminum:
2.1 KG

Plastic:
8.7 KG

Glass:
4.2 KG

Precious-material category:
0.03 KG

Mark everything:

"SIMULATED RECOVERY RESULT"

==================================================
19. ENVIRONMENTAL IMPACT SIMULATION
===================================

Environmental calculations must be clearly identified as estimates.

Example:

Simulated E-Waste:
125 KG

Estimated CO₂e Avoided:
235 KG CO₂e

Estimated Material Recovery:
87 KG

Do not claim that these are scientifically verified measurements.

Store the calculation factors in:

simulation_environmental_factors

Allow administrators to modify them.

==================================================
20. SIMULATED REWARDS
=====================

Create a reward simulation.

Example:

1 simulated KG = 10 simulated points

Pickup:

8.4 KG

Simulated Reward:

84 points

Label:

"Simulated Reward"

Allow:

Earn
Redeem
Reverse
Adjust

All transactions should be stored.

==================================================
21. SIMULATED REWARD STORE
==========================

Create fictional rewards:

Eco Bottle
100 points

Plant Kit
250 points

Eco Shopping Voucher
500 points

Green Starter Kit
1,000 points

No real purchases.

When redeemed:

show:

"Simulation Redemption Successful"

Do not connect to a real payment system.

==================================================
22. SIMULATED NOTIFICATIONS
===========================

Create an in-app notification simulator.

Examples:

"Your simulated pickup has been confirmed."

"Simulated agent EcoAgent 01 is on the way."

"Simulated pickup completed."

"Your e-waste has entered simulated recycling."

"Simulated recycling process completed."

"Simulated reward points credited."

Provide a notification center.

==================================================
23. SIMULATED EMAIL
===================

Do NOT send real emails.

Create an email preview system.

Admin can click:

"Preview Email"

and see:

From:
EcoCycle Simulation

To:
[customer@example.demo](mailto:customer@example.demo)

Subject:
Simulated Pickup Confirmation

The email must never actually be delivered.

==================================================
24. SIMULATED SMS / WHATSAPP
============================

Do not send messages.

Instead create a simulated communication log.

Example:

Channel:
SMS

Status:
SIMULATED

Message:
"Your EcoCycle pickup has been completed."

==================================================
25. SIMULATED CERTIFICATE
=========================

Create a digital certificate for completed simulated recycling.

Certificate:

SIM-CERT-000001

Contents:

Customer:
Aarav Sharma

Batch:
SIM-BATCH-000001

Input:
125 KG

Simulated Recycled:
87 KG

Simulated Processing Date:
25 Sept 2026

IMPORTANT:

Display clearly:

"SIMULATION CERTIFICATE — NOT A REAL RECYCLING CERTIFICATE"

Generate QR code pointing to the local simulated verification page.

==================================================
26. CERTIFICATE VERIFICATION
============================

Create:

/verify/simulation/:certificateId

Display:

SIMULATION CERTIFICATE

Certificate:
SIM-CERT-000001

Status:
SIMULATED / VERIFIED

This certificate represents simulated data only.

==================================================
27. ADMIN SIMULATION CONTROL CENTER
===================================

Create a dedicated:

Simulation Control Center

Features:

▶ Start Simulation
⏸ Pause
⏭ Next Event
⏩ Speed
🔄 Reset
🎲 Generate Scenario
🧹 Clear Demo Data

Show:

Simulation Clock
Current Event
Active Scenarios
Completed Events
System State

==================================================
28. SCENARIO GENERATOR
======================

Create predefined simulation scenarios.

Scenario 1:
Normal Pickup

Scenario 2:
High Volume Day

Scenario 3:
Agent Delay

Scenario 4:
Pickup Cancellation

Scenario 5:
Weight Difference

Scenario 6:
Center Near Capacity

Scenario 7:
Recycler Processing Delay

Scenario 8:
Hazardous Material Detected

Scenario 9:
Failed Pickup

Scenario 10:
Complete Successful Lifecycle

Each scenario should generate appropriate fictional data.

==================================================
29. SIMULATION EVENT ENGINE
===========================

Create an event queue.

Example:

Event:

SIM_PICKUP_CREATED

→ SIM_AGENT_ASSIGNED

→ SIM_AGENT_STARTED

→ SIM_AGENT_ARRIVED

→ SIM_WEIGHT_VERIFIED

→ SIM_PICKUP_COMPLETED

→ SIM_INVENTORY_RECEIVED

→ SIM_BATCH_CREATED

→ SIM_RECYCLING_STARTED

→ SIM_RECYCLING_COMPLETED

→ SIM_CERTIFICATE_GENERATED

→ SIM_REWARD_CREDITED

Every event should be logged.

==================================================
30. SIMULATION EVENT LOG
========================

Create an event viewer.

Example:

10:30:01
SIM_PICKUP_CREATED

10:30:03
SIM_AGENT_ASSIGNED

10:30:06
SIM_AGENT_ARRIVED

10:30:08
SIM_PICKUP_COMPLETED

10:30:12
SIM_BATCH_CREATED

10:30:16
SIM_RECYCLING_COMPLETED

10:30:18
SIM_CERTIFICATE_GENERATED

==================================================
31. ADMIN DASHBOARD
===================

Admin dashboard must use simulated data.

KPIs:

Simulated Customers
Simulated Pickups
Simulated E-Waste
Simulated Recycling
Simulated Inventory
Simulated Agents
Simulated Centers
Simulated Batches

Every dashboard section should contain:

"Simulation Data"

Do not present simulated metrics as real-world statistics.

==================================================
32. SIMULATION ANALYTICS
========================

Charts:

* simulated pickups per day
* simulated e-waste by category
* simulated recycling percentage
* simulated material recovery
* simulated agent activity
* simulated center capacity
* simulated recycler throughput
* simulated rewards
* simulated environmental estimates

Allow:

Today
7 Days
30 Days
90 Days
Custom Simulation Period

==================================================
33. SIMULATED MAP ANALYTICS
===========================

Show fictional locations:

* customers
* agents
* collection centers
* recycling facilities

Allow filtering by:

* pickup status
* agent
* center
* category

All coordinates are fictional.

==================================================
34. USER ROLES
==============

Support:

CUSTOMER
COLLECTION_AGENT
CENTER_MANAGER
RECYCLER
ADMIN

All roles operate only within the simulation.

==================================================
35. DATABASE
============

Use PostgreSQL + Prisma if a database is required.

Create tables:

users
addresses
ewaste_categories
pickup_requests
pickup_items
simulation_agents
collection_centers
inventory_items
recycling_batches
recycling_processes
recovered_materials
certificates
reward_rules
reward_transactions
complaints
notifications
simulation_events
simulation_scenarios
simulation_settings
simulation_locations
audit_logs

Add a field where useful:

is_simulated = true

or:

environment = "SIMULATION"

The application must reject attempts to create non-simulated
operational records.

==================================================
36. SIMULATION DATA ISOLATION
=============================

All demo records must be clearly separated from any potential
future production records.

Use:

environment = SIMULATION

throughout relevant entities.

Never mix simulation and production data.

If production mode is ever implemented later, it must require
explicit configuration.

Default:

SIMULATION_ONLY=true

==================================================
37. API
=======

Create simulated APIs.

Examples:

POST /api/simulation/start
POST /api/simulation/pause
POST /api/simulation/reset
POST /api/simulation/next-event
POST /api/simulation/scenario

GET /api/simulation/status
GET /api/simulation/events
GET /api/simulation/clock

POST /api/simulation/pickups
POST /api/simulation/pickups/:id/run

POST /api/simulation/sorting/:id/run
POST /api/simulation/recycling/:id/run

POST /api/simulation/rewards/:id/simulate
POST /api/simulation/certificate/:id/generate

All APIs must return simulated data.

==================================================
38. NO REAL TRANSACTIONS
========================

Absolutely no:

* real payment
* real purchase
* real donation
* real pickup
* real delivery
* real recycling booking
* real GPS tracking
* real communication
* real environmental certification

Everything must remain inside the simulation.

==================================================
39. SECURITY
============

Even though this is a simulation:

* implement authentication
* implement authorization
* validate input
* protect APIs
* use secure password hashing
* protect admin controls
* log important actions
* validate uploads
* prevent unauthorized simulation manipulation

==================================================
40. UI LABELING
===============

Use explicit labels.

Examples:

"Simulated Pickup"

"Simulated Weight"

"Simulated Location"

"Estimated Environmental Impact"

"Simulation Certificate"

"Simulation Reward"

"Demo Data"

"Simulation Event"

Avoid UI language that implies a real-world transaction.

==================================================
41. DEMO MODE
=============

Create a one-click demo mode.

Button:

"Launch Demo"

When clicked:

1. Reset simulation
2. Generate sample users
3. Generate pickup requests
4. Generate agents
5. Generate collection centers
6. Generate inventory
7. Generate batches
8. Run sample recycling
9. Generate certificates
10. Generate rewards
11. Populate dashboard
12. Open admin dashboard

The application should become immediately demonstrable.

==================================================
42. DEMO STORY MODE
===================

Create an optional guided demonstration.

Scenario:

"Aarav wants to recycle an old laptop."

Step 1:
Aarav creates simulated pickup.

Step 2:
System assigns EcoAgent 01.

Step 3:
Agent moves toward simulated location.

Step 4:
Agent collects laptop.

Step 5:
Simulated weight = 2.8 KG.

Step 6:
Center receives laptop.

Step 7:
Laptop is sorted.

Step 8:
Batch is created.

Step 9:
Recycler processes batch.

Step 10:
Materials are simulated as recovered.

Step 11:
Certificate is generated.

Step 12:
Aarav receives simulated reward.

Show this as an interactive timeline.

==================================================
43. RESET
=========

Provide:

"Reset Simulation"

This must:

* stop running simulations
* clear simulation events
* optionally delete simulation records
* regenerate seed data
* reset simulation clock
* reset dashboards

Never delete anything outside the simulation environment.

==================================================
44. OFFLINE SUPPORT
===================

The core application should work locally without external services.

External integrations must not be necessary.

If possible, support local development with:

* PostgreSQL
* local file storage
* mock notification provider
* mock map provider

==================================================
45. TESTING
===========

Test the simulation engine thoroughly.

Unit tests:

* reward simulation
* weight simulation
* sorting simulation
* recycling simulation
* environmental estimation
* status transitions
* event generation
* simulation clock

Integration tests:

* create simulated pickup
* assign simulated agent
* complete simulated pickup
* create inventory
* create batch
* process recycling
* generate certificate
* credit rewards

E2E:

Launch Demo
→ Customer Pickup
→ Agent Movement
→ Collection
→ Inventory
→ Batch
→ Recycling
→ Certificate
→ Reward

==================================================
46. PROJECT STRUCTURE
=====================

Use a structure similar to:

app/
components/
lib/
simulation/
engine/
clock/
events/
scenarios/
generators/
workflows/
calculations/
providers/
prisma/
tests/
docs/
public/

==================================================
47. CODE QUALITY
================

Use:

* TypeScript
* strict typing
* reusable components
* modular architecture
* service layer
* validation schemas
* clear domain models
* enums
* centralized simulation configuration
* deterministic simulation support

Avoid:

* fake UI without functionality
* hard-coded dashboard numbers
* random behavior that cannot be reproduced
* real external integrations
* real-world transactions

==================================================
48. DETERMINISTIC SIMULATION
============================

The simulation should support a seed.

Example:

Simulation Seed:
EC0CYCLE-2026

If the same seed is used, generated simulation data should be
reproducible wherever practical.

Allow:

Seed:
[ EC0CYCLE-2026 ]

[Generate Scenario]

==================================================
49. SIMULATION CONFIGURATION
============================

Create an admin simulation configuration screen.

Settings:

Simulation speed
Default seed
Pickup duration
Agent travel speed
Weight variance
Sorting factors
Recycling factors
Reward factors
Environmental factors
Failure probability
Delay probability

All values are simulation parameters.

==================================================
50. DOCUMENTATION
=================

Create:

README.md

docs/
architecture.md
simulation-engine.md
database.md
api.md
demo-guide.md
testing.md

README must explicitly state:

"This project is a simulation and educational/demo system.
It does not perform real-world e-waste collection, recycling,
payments, logistics, communication, or environmental certification."

==================================================
51. DEFINITION OF DONE
======================

The project is complete when:

✓ Application starts successfully
✓ Simulation mode is always enabled
✓ No external API keys are required
✓ Demo data can be generated
✓ Simulation clock works
✓ Simulation scenarios work
✓ Customer workflow works
✓ Agent workflow works
✓ Center workflow works
✓ Recycler workflow works
✓ Inventory works
✓ Batch processing works
✓ Recycling simulation works
✓ Reward simulation works
✓ Environmental estimates work
✓ Certificate simulation works
✓ Notifications are simulated
✓ Map is simulated
✓ Admin dashboard works
✓ Analytics use actual simulated database data
✓ Reports work
✓ Audit logs work
✓ Reset simulation works
✓ Demo mode works
✓ Tests pass
✓ Production build succeeds
✓ Documentation is complete

FINAL PRINCIPLE:

Build a realistic, polished, fully functional e-waste management
SIMULATOR.

The system should feel like a real enterprise e-waste management
platform while making it absolutely clear that every operation,
location, measurement, transaction, notification, recycling result,
certificate, reward, and environmental metric is simulated.

Never perform or imply a real-world transaction.
Never require real external services.
Never represent simulation results as actual recycling results.

Prioritize:

1. Functionality
2. Simulation realism
3. Data consistency
4. UX
5. Security
6. Reproducibility
7. Demonstration quality
8. Maintainability

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
