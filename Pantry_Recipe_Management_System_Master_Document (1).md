# **PANTRY \& RECIPE MANAGEMENT SYSTEM**

# **Master Project Document**

## **1. Project Title**

## 

## **Pantry \& Recipe Management System**



2\. Project Overview



The Pantry \& Recipe Management System is a database-driven application designed to help users maintain a digital record of their pantry items, track expiry dates, discover suitable recipes, automatically update stock after cooking, and monitor food waste.



The core system uses a relational database with SQL and PL/SQL. Pantry inventory, ingredients, recipes, cooking activity, purchases, expiry information, and waste records are maintained in an Oracle database.



The system uses a web-based recipe retrieval and AI-assisted recommendation mechanism to improve recipe discovery. When a suitable recipe already exists in the database, SQL-based matching is used first. If no suitable stored recipe is found, the backend searches for a real, published recipe from the web. AI then analyzes the retrieved recipe against the user's current pantry and preferences.



The AI does not invent a new recipe from scratch. Instead, it:



Finds or works with real published recipes.

Considers available ingredients and user preferences.

Considers consumer ratings/reviews when available.

Selects an appropriate recipe.

Determines whether the recipe's quantities can be proportionally adjusted.

Changes quantities only when the resulting recipe remains valid.

Returns the original recipe when quantity modification is not valid.



Before the recipe is accepted, the backend validates the recipe against the current Oracle pantry. Once validated, the recipe can be stored in the database for future recommendations.



Thus, the system combines:



Relational database management

SQL-based recipe matching

Web-based recipe retrieval

AI-assisted recipe selection and adaptation

PL/SQL procedures and functions

Triggers

Transactions

Pantry and expiry management

Automatic stock deduction

Cooking history

Waste tracking

Reports



The system is built around an Oracle database supporting digital pantry inventory, expiry tracking, recipe recommendation, automatic stock deduction, and waste tracking/reporting.



3\. Problem Statement



Households often lose track of the food items they have purchased. Pantry items may remain unused until they expire, users may accidentally purchase duplicate groceries, and they may struggle to decide what to cook with the ingredients currently available.



The system addresses these problems by maintaining a digital pantry and connecting pantry inventory with recipes, cooking activity, expiry information, and waste records.



The primary problems addressed are:



Untracked pantry items

Forgotten expiry dates

Food wastage

Duplicate purchases

Difficulty deciding what to cook

Lack of automatic stock updates after cooking

Difficulty finding suitable real recipes based on currently available ingredients

4\. Objectives

Maintain a digital pantry inventory.

Store ingredient quantities and units.

Track expiry dates.

Maintain a structured recipe database.

Recommend recipes based on available ingredients.

Retrieve real published recipes when no suitable stored recipe is available.

Consider consumer ratings/reviews where available.

Consider cooking level, cooking time, difficulty, dietary requirements, and other recipe properties.

Adapt ingredient quantities only when valid proportional scaling is possible.

Validate recipe quantities against the actual pantry before accepting a recipe.

Automatically deduct ingredients after cooking.

Maintain cooking history.

Detect expired pantry items.

Record wasted ingredients.

Generate waste and pantry-related reports.

Cache accepted externally retrieved recipes in the database for future recommendations.

5\. Core Features



The system consists of five primary capabilities.



5.1 Digital Pantry Inventory



Users can add and manage ingredients currently available in their pantry.



Example:



Rice       2 kg

Paneer     250 g

Bread      1 packet

Egg        6 pieces

Onion      4 pieces



The quantity stored in the pantry represents the user's current available stock.



5.2 Expiry Date Tracking



Each pantry item can have an expiry date.



The system identifies expired stock, records the wasted quantity in WASTE\_LOG, and removes the expired pantry record according to the expiry-management logic.



5.3 Recipe Recommendation



The system uses a two-stage recommendation process.



Stage 1 — Database Matching



SQL searches the stored recipes and compares their ingredient requirements against the user's current pantry.



If a suitable recipe is found, the database recipe is recommended.



Stage 2 — Web Recipe Retrieval



If no suitable stored recipe is found, the backend searches for a real published recipe from an appropriate web source.



The retrieved recipe is then analyzed by the AI recommendation layer.



The AI does not create a fictional recipe. It works from the retrieved recipe and determines whether it is suitable for the user's pantry and preferences.



5.4 Automatic Stock Deduction



When the user cooks a recipe, the system automatically deducts the required quantities from the pantry.



The stock deduction is handled by the backend and Oracle database rather than by the AI.



5.5 Waste Tracking and Reports



Expired or wasted ingredients are recorded in WASTE\_LOG.



The system can generate reports such as:



Total waste

Most wasted ingredients

Waste over time

Pantry-related statistics

6\. System Architecture

┌─────────────────────────────────────────────┐

│                  FRONTEND                   │

│           React + Vite + Tailwind           │

└─────────────────────┬───────────────────────┘

&#x20;                     │ REST API

&#x20;                     ▼

┌─────────────────────────────────────────────┐

│                  BACKEND                    │

│             Node.js + Express               │

│                                             │

│ Authentication                              │

│ Pantry APIs                                 │

│ Recipe APIs                                 │

│ SQL recommendation logic                    │

│ Web recipe retrieval                        │

│ AI integration                              │

│ Recipe validation                            │

└───────────────┬─────────────────┬───────────┘

&#x20;               │                 │

&#x20;               ▼                 ▼

┌────────────────────────┐ ┌──────────────────┐

│       ORACLE DB        │ │   WEB / RECIPE   │

│                        │ │      SOURCES     │

│ SQL + PL/SQL           │ │                  │

│ Tables                 │ │ Real published   │

│ Procedures             │ │ recipes          │

│ Functions              │ │ Ratings/reviews  │

│ Triggers               │ │ where available │

│ Transactions           │ │                  │

└────────────────────────┘ └────────┬─────────┘

&#x20;                                   │

&#x20;                                   ▼

&#x20;                            ┌──────────────┐

&#x20;                            │      AI      │

&#x20;                            │              │

&#x20;                            │ Recipe       │

&#x20;                            │ selection    │

&#x20;                            │ + adaptation │

&#x20;                            └──────────────┘

Architectural Responsibilities



Oracle Database



Source of truth for pantry quantities.

Stores recipes and recipe ingredients.

Performs SQL matching.

Handles stock operations.

Handles transactions.

Maintains cooking and waste records.



Backend



Connects frontend, Oracle, web sources, and AI.

Retrieves pantry data.

Performs recipe retrieval.

Sends relevant information to AI.

Validates AI output against Oracle.

Stores accepted recipes.



AI



Understands recipe requirements.

Selects appropriate real recipes.

Considers pantry and user preferences.

Determines whether proportional quantity adjustment is possible.

Does not directly modify the database.



Web / Recipe Sources



Provide real, existing, published recipes.

Provide ratings/reviews where available.

Serve as the source of recipes that are not already stored in the database.

7\. Database Schema



The finalized database contains 11 tables.



1\. USERS

2\. CATEGORIES

3\. INGREDIENTS

4\. PANTRY\_ITEMS

5\. SUPPLIERS

6\. PURCHASE\_LOG

7\. RECIPES

8\. RECIPE\_INGREDIENTS

9\. COOKING\_LOG

10\. DIETARY\_TAGS

11\. WASTE\_LOG

7.1 USERS

USERS

\--------------------------------

user\_id          PK

name

email            UNIQUE

password\_hash

cooking\_level



cooking\_level:



BEGINNER

INTERMEDIATE

ADVANCED

7.2 CATEGORIES

CATEGORIES

\--------------------------------

cat\_id           PK

label

shelf\_life\_days



Examples:



Vegetables

Dairy

Grains

Meat

Fruits

7.3 INGREDIENTS

INGREDIENTS

\--------------------------------

ingredient\_id    PK

name

default\_unit

cat\_id           FK



INGREDIENTS represents the generic ingredient, while PANTRY\_ITEMS represents the actual quantity owned by a user.



7.4 PANTRY\_ITEMS

PANTRY\_ITEMS

\--------------------------------

item\_id          PK

user\_id          FK

ingredient\_id    FK

purchase\_id      FK, nullable

quantity

unit

expiry\_date



purchase\_id is nullable because a user may manually add an item without recording a corresponding purchase.



7.5 SUPPLIERS

SUPPLIERS

\--------------------------------

sup\_id           PK

name

contact

7.6 PURCHASE\_LOG

PURCHASE\_LOG

\--------------------------------

purchase\_id      PK

user\_id          FK

ingredient\_id    FK

sup\_id           FK

purchase\_date

quantity\_purchased

unit

total\_price

7.7 RECIPES

RECIPES

\--------------------------------

recipe\_id        PK

name

steps

cook\_time\_min

difficulty\_level

utensil\_count

source



difficulty\_level:



BEGINNER

INTERMEDIATE

ADVANCED



source identifies how the recipe entered the database:



MANUAL

WEB\_RETRIEVED



MANUAL represents recipes initially entered/seeded by the project.



WEB\_RETRIEVED represents real recipes retrieved through the web recipe pipeline and subsequently stored in the database.



7.8 RECIPE\_INGREDIENTS

RECIPE\_INGREDIENTS

\--------------------------------

ri\_id            PK

recipe\_id        FK

ingredient\_id    FK

quantity\_required

unit



Constraint:



UNIQUE(recipe\_id, ingredient\_id)



quantity\_required represents the amount of an ingredient required to prepare the stored recipe.



It is not the user's current pantry quantity.



7.9 COOKING\_LOG

COOKING\_LOG

\--------------------------------

cook\_id          PK

user\_id          FK

recipe\_id        FK

cooked\_at

7.10 DIETARY\_TAGS

DIETARY\_TAGS

\--------------------------------

tag\_id           PK

recipe\_id        FK

label



Examples:



Vegetarian

High Protein

Vegan

Gluten Free

7.11 WASTE\_LOG

WASTE\_LOG

\--------------------------------

waste\_id         PK

ingredient\_id    FK

quantity\_wasted

unit

expired\_on



The system uses ingredient-level waste tracking rather than linking the waste record directly to a pantry row. This allows the expiry logic to record waste and remove the expired pantry item without creating an FK conflict.



8\. Main Database Relationships

USERS

&#x20;│

&#x20;├───────────────< PANTRY\_ITEMS

&#x20;├───────────────< PURCHASE\_LOG

&#x20;└───────────────< COOKING\_LOG





CATEGORIES

&#x20;│

&#x20;└───────────────< INGREDIENTS

&#x20;                      │

&#x20;                      ├────────< PANTRY\_ITEMS

&#x20;                      ├────────< PURCHASE\_LOG

&#x20;                      ├────────< RECIPE\_INGREDIENTS

&#x20;                      └────────< WASTE\_LOG





SUPPLIERS

&#x20;│

&#x20;└───────────────< PURCHASE\_LOG





PURCHASE\_LOG

&#x20;│

&#x20;└───────────────< PANTRY\_ITEMS





RECIPES

&#x20;│

&#x20;├───────────────< RECIPE\_INGREDIENTS

&#x20;├───────────────< COOKING\_LOG

&#x20;└───────────────< DIETARY\_TAGS

9\. Complete User Workflow

Step 1 — Registration/Login

User

&#x20;↓

Frontend

&#x20;↓

Backend

&#x20;↓

USERS



The user registers or logs into the application.



Step 2 — Add Pantry Items



The user adds currently available ingredients.



Frontend

&#x20;↓

Backend

&#x20;↓

PANTRY\_ITEMS

Step 3 — Optional Purchase Recording



A purchase can be recorded:



Purchase

&#x20;↓

PURCHASE\_LOG

&#x20;↓

PANTRY\_ITEMS



This maintains both purchasing history and current inventory.



10\. Recipe Recommendation Workflow



Suppose the user has:



Bread       4 pieces

Paneer      250g

Onion       3 pieces

Egg         6 pieces



The user selects:



Cooking Level: Beginner

Maximum Time: 20 minutes

Dietary Preference: Vegetarian



and presses:



What Can I Cook?



The recommendation process begins.



Step 1 — Retrieve Current Pantry



The backend retrieves the user's current pantry from Oracle.



The current pantry quantities are always taken from Oracle at the time of the request.



Step 2 — Search Stored Recipes



SQL searches:



RECIPES

&#x20;    ↓

RECIPE\_INGREDIENTS

&#x20;    ↓

INGREDIENTS

&#x20;    ↓

PANTRY\_ITEMS



The system compares:



quantity\_available >= quantity\_required



for each required ingredient.



Step 3 — Suitable Stored Recipe Found



If a suitable stored recipe is found:



Oracle

&#x20;↓

SQL matching

&#x20;↓

Suitable recipe

&#x20;↓

Return recipe



No web retrieval is necessary.



The stored recipe's instructions, ingredients, cooking time, difficulty, and dietary information are displayed.



11\. Case A — All Ingredients Are Available



Example stored recipe:



Paneer Sandwich



Bread    2

Paneer   100g

Onion    1



User has:



Bread    4

Paneer   250g

Onion    3



The system determines:



Bread:  4 >= 2       ✓

Paneer: 250 >= 100g  ✓

Onion:  3 >= 1       ✓



Therefore:



100% Available



The recipe is shown as ready to cook.



12\. Case B — One Ingredient Is Missing



Stored recipe:



Bread

Paneer

Cheese

Onion



User has:



Bread

Paneer

Onion



but no cheese.



The system reports:



Almost Available



Missing:

Cheese



The database must not claim that the recipe is fully cookable.



AI may optionally find an appropriate real recipe alternative or suggest a valid modification, but the backend must validate any resulting recipe before accepting it.



13\. Case C — No Suitable Stored Recipe



If SQL returns no suitable stored recipe, the web recipe retrieval pipeline begins.



PANTRY\_ITEMS

&#x20;     ↓

Backend retrieves current ingredients

&#x20;     ↓

Search web / appropriate recipe source

&#x20;     ↓

Find real published recipes

&#x20;     ↓

Consider ratings/reviews where available

&#x20;     ↓

AI analyzes candidate recipes

&#x20;     ↓

Select suitable recipe

&#x20;     ↓

Check quantity compatibility

&#x20;     ↓

Backend validates against Oracle

&#x20;     ↓

Store accepted recipe

&#x20;     ↓

Display recipe

14\. Web Recipe Retrieval



The web recipe retrieval layer searches for existing recipes, rather than asking the AI to invent one.



The search should consider:



Available pantry ingredients

User cooking level

Maximum cooking time

Dietary requirements

Recipe relevance

Consumer ratings/reviews where available



For example:



Pantry:

Rice

Egg

Onion

Tomato



Search:

"egg rice recipes"



The system retrieves real published recipe candidates.



The AI then evaluates the candidates based on the user's requirements.



15\. AI Recipe Selection



The AI receives:



Current pantry

\+

User preferences

\+

Retrieved recipe information



The AI's job is to:



Understand the recipe ingredients.

Compare them with the pantry.

Consider cooking time.

Consider difficulty.

Consider dietary requirements.

Consider ratings/reviews where available.

Select an appropriate real recipe.

Determine whether quantity adjustment is possible.



The AI does not directly modify Oracle.



The backend remains responsible for validation.



16\. Quantity Adaptation



Recipe quantities may differ from the user's available quantities.



The system should not automatically change quantities in every situation.



Quantity adjustment is allowed only when the recipe can be proportionally scaled while remaining a valid dish.



Example:



Published recipe:



Rice       500g

Paneer     250g

Onion      2



User pantry:



Rice       300g

Paneer     150g

Onion      1



Scaling factor:



300 / 500 = 0.6

150 / 250 = 0.6

1 / 2     = 0.5



The most restrictive factor is used.



The resulting recipe must be checked to ensure that every ingredient remains at a usable quantity.



If valid, the quantities can be adapted.



17\. Quantity Scaling Rule



For continuous ingredients:



scale\_factor =

minimum(available\_quantity / required\_quantity)



Then:



scaled\_quantity =

required\_quantity × scale\_factor



For countable ingredients such as eggs, onions, or bread:



scaled\_quantity =

floor(required\_quantity × scale\_factor)



If scaling produces:



0 eggs



the ingredient is treated as unavailable rather than allowing an invalid zero-quantity recipe.



The final scaling factor must be based on the most restrictive ingredient, rather than averaging quantities.



The adapted recipe must be validated before it is accepted.



18\. When Quantity Scaling Is NOT Possible



If the recipe contains an essential ingredient that the user does not have, the system must not simply change quantities to make the recipe appear valid.



Example:



Published recipe:



Rice       500g

Paneer     250g

Cream      200ml

Onion      2



Pantry:



Rice       300g

Paneer     150g

Onion      1

Cream      0



The system cannot simply scale the recipe because cream is completely unavailable.



Therefore:



Recipe cannot be fully prepared.



Missing:

Cream — 200ml



The system should not fabricate a replacement ingredient.



19\. Backend Validation



This is a critical architectural rule.



AI output is not considered authoritative for inventory.



After AI selects or adapts a recipe, the backend checks the result against Oracle.



Example:



AI returns:



Rice     300g

Egg      2

Onion    1



Oracle contains:



Rice     250g

Egg      4

Onion    1



The backend detects:



Rice:

300g > 250g



Therefore:



REJECT / REPROCESS



The recipe cannot be marked as fully available.



Oracle remains the source of truth.



20\. Recipe Storage



Once a recipe has been successfully validated, it is stored in the existing database.



Validated Recipe

&#x20;     ↓

RECIPES

&#x20;     +

RECIPE\_INGREDIENTS

&#x20;     +

DIETARY\_TAGS



If the recipe was retrieved from the web:



source = 'WEB\_RETRIEVED'



This means the system does not need to retrieve the same recipe from the web every time.



21\. Reusing Previously Retrieved Recipes



Suppose the first user has:



Rice       300g

Paneer     150g

Onion      1



The system retrieves a real web recipe, validates it, and stores it.



Later another user has:



Rice       500g

Paneer     250g

Onion      2



SQL can search the stored recipe database first.



If the stored recipe is suitable:



User Pantry

&#x20;    ↓

SQL matching

&#x20;    ↓

Stored Recipe

&#x20;    ↓

Available

&#x20;    ↓

Recommend



No new web search is required.



Therefore, externally retrieved recipes become part of the system's growing recipe library.



22\. Database Recipe vs Web-Retrieved Recipe

Feature	Stored Recipe	Web-Retrieved Recipe

Recipe name	Database	Retrieved source

Ingredients	Database	Retrieved source

Quantities	Database	Retrieved source / validated adaptation

Instructions	Database	Retrieved source

Cooking time	Database	Retrieved source

Difficulty	Database / source	Source / normalized

Consumer rating	Stored if included	Retrieved where available

Source	MANUAL	WEB\_RETRIEVED

Requires web retrieval	No	Initially

Stored for future use	Yes	Yes



Once a web recipe has been validated and stored, it becomes a normal recipe within the application's database.



23\. Recipe Matching Logic



For every recipe ingredient:



Find corresponding pantry ingredient.



If available quantity >= required quantity:

&#x20;   Ingredient is available.



Else:

&#x20;   Ingredient is missing/insufficient.



Availability can be calculated as:



availability % =

(available required ingredients / total required ingredients) × 100



Classification:



100%      → Fully Available

75–99%    → Almost Available

<75%      → Low Availability



Exact thresholds can be finalized during implementation.



24\. Recommendation Ranking



Among valid candidate recipes, the system can consider:



Ingredient availability

Dietary requirements

Cooking level

Recipe difficulty

Cooking time

Consumer ratings/reviews where available

Ingredients nearing expiry



The ranking must not override hard inventory constraints.



For example, a highly rated recipe that requires an unavailable essential ingredient cannot be treated as fully available merely because it has a high rating.



25\. AI Integration



The AI component belongs to the application/backend layer, not the database schema.



The database remains Oracle.



The AI does not directly execute SQL or modify pantry quantities.



The AI receives structured information from the backend:



Current Pantry

\+

User Preferences

\+

Retrieved Recipe Candidates



It returns structured recipe information to the backend.



The backend then validates the returned recipe against Oracle.



26\. AI Responsibility



The AI is responsible for:



Recipe discovery/analysis

&#x20;       ↓

Recipe selection

&#x20;       ↓

Recipe quantity adaptation when valid

&#x20;       ↓

Recipe explanation/formatting



The AI is not responsible for:



Determining actual pantry stock

&#x20;       ↓

Changing Oracle data

&#x20;       ↓

Deducting stock

&#x20;       ↓

Recording cooking transactions



These operations remain under backend + Oracle control.



27\. No Additional AI Tables



No additional tables are required for AI.



The system does not need:



AI\_RECIPES

AI\_REQUESTS

AI\_RESPONSES

AI\_LOGS



A retrieved and validated recipe is stored using:



RECIPES

RECIPE\_INGREDIENTS

DIETARY\_TAGS



The source field in RECIPES identifies externally retrieved recipes.



28\. Recipe Source and Attribution



Externally retrieved recipes originate from real published sources.



The application should retain or display the original recipe source where appropriate.



The system should respect the terms and usage conditions of the recipe websites or search sources used.



The application should not represent externally sourced recipes as original content created by the application.



29\. Recipe Quantity vs Pantry Quantity



These two quantities have different meanings.



Pantry quantity

PANTRY\_ITEMS.quantity



means:



How much of the ingredient the user currently has.



Recipe quantity

RECIPE\_INGREDIENTS.quantity\_required



means:



How much of the ingredient the recipe requires.



Example:



PANTRY:

Rice → 1kg



RECIPE:

Rice → 250g



The recipe does not change when the user's pantry changes.



Only the availability check changes.



Therefore:



Day 1:

Rice = 1kg

Recipe requires = 250g

→ Available



Day 2:

Rice = 150g

Recipe requires = 250g

→ Insufficient



The same stored recipe can therefore be evaluated against different pantry quantities.



30\. Recipe Selection and Cooking



Once a recipe is selected, the backend calls:



cook\_recipe(user\_id, recipe\_id)



The procedure:



Checks current ingredient availability.

Deducts required quantities.

Inserts a cooking event into COOKING\_LOG.

Commits the transaction.



The availability is checked again immediately before cooking, because pantry quantities may have changed after the recipe was originally recommended.



31\. Example Stock Deduction



Before cooking:



Bread      4

Paneer     250g

Onion      3



Recipe requires:



Bread      2

Paneer     100g

Onion      1



After cooking:



Bread      2

Paneer     150g

Onion      2



A new record is inserted into:



COOKING\_LOG

32\. Expiry Management



The expiry logic:



Detects expired stock.

Inserts the expired quantity into WASTE\_LOG.

Removes the expired pantry item.

Expired PANTRY\_ITEMS

&#x20;       ↓

Expiry Logic

&#x20;       ↓

WASTE\_LOG

&#x20;       ↓

Remove expired stock

33\. Waste Reporting



Using WASTE\_LOG, the system can generate:



Total Waste



Example:



1.5 kg

Most Wasted Ingredients

Ingredient       Quantity

Onion            1.2 kg

Tomato           0.8 kg

Paneer           0.5 kg

Waste Over Time



Monthly or date-based waste summaries can be generated using SQL.



34\. DBMS Concepts Demonstrated



The project demonstrates:



Relational Design



Multiple related tables instead of one large table.



Primary Keys



Each major entity has a unique identifier.



Foreign Keys



Example:



PANTRY\_ITEMS.ingredient\_id

&#x20;       ↓

INGREDIENTS.ingredient\_id

Constraints



Examples:



email UNIQUE

quantity > 0

quantity\_required > 0

quantity\_purchased > 0

total\_price >= 0

Normalization



The schema follows 3NF by separating:



Ingredient information

User stock

Recipe information

Recipe requirements

Purchase information

Cooking history

Waste information

SQL Joins



Recipe recommendation requires joins across:



RECIPES

RECIPE\_INGREDIENTS

INGREDIENTS

PANTRY\_ITEMS

Indexes



Indexes can be created for frequently searched foreign keys and recipe-matching fields.



PL/SQL Functions



Example:



match\_recipe(recipe\_id)



calculates recipe availability.



PL/SQL Procedures



Example:



cook\_recipe(user\_id, recipe\_id)



handles cooking and stock deduction.



Triggers



Expiry handling.



Transactions



Stock deduction and cooking-log insertion occur as a consistent transaction.



35\. Unit Convention



The system uses a canonical unit per ingredient, defined by:



INGREDIENTS.default\_unit



Quantity fields in pantry, purchase, and recipe tables explicitly store their units.



The team does not need to build a general-purpose unit-conversion engine.



For a given ingredient, quantities are expected to use its canonical unit.



Examples:



Rice      → kg

Paneer    → g

Egg       → piece

Bread     → piece

Oil       → ml

36\. Complete End-to-End Recipe Flow

&#x20;                        USER

&#x20;                          │

&#x20;                          ▼

&#x20;                 "WHAT CAN I COOK?"

&#x20;                          │

&#x20;                          ▼

&#x20;                      BACKEND

&#x20;                          │

&#x20;                          ▼

&#x20;                  CURRENT PANTRY

&#x20;                          │

&#x20;                          ▼

&#x20;                    ORACLE DB

&#x20;                          │

&#x20;                          ▼

&#x20;                  SQL MATCHING

&#x20;                          │

&#x20;             ┌────────────┴────────────┐

&#x20;             │                         │

&#x20;             ▼                         ▼

&#x20;     SUITABLE RECIPE             NO SUITABLE

&#x20;       FOUND                       RECIPE

&#x20;             │                         │

&#x20;             ▼                         ▼

&#x20;      STORED RECIPE             WEB SEARCH

&#x20;                                       │

&#x20;                                       ▼

&#x20;                               REAL PUBLISHED

&#x20;                                   RECIPES

&#x20;                                       │

&#x20;                                       ▼

&#x20;                                      AI

&#x20;                                       │

&#x20;                        ┌──────────────┴──────────────┐

&#x20;                        │                             │

&#x20;                 SELECT RECIPE              QUANTITY ADAPTATION

&#x20;                                                      │

&#x20;                                                      ▼

&#x20;                                            IF VALID SCALING

&#x20;                                                      │

&#x20;                                                      ▼

&#x20;                                                 BACKEND

&#x20;                                                      │

&#x20;                                                      ▼

&#x20;                                             ORACLE VALIDATION

&#x20;                                                      │

&#x20;                                                      ▼

&#x20;                                              STORE RECIPE

&#x20;                                                      │

&#x20;                        ┌─────────────────────────────┘

&#x20;                        ▼

&#x20;                 SHOW RECOMMENDATIONS

&#x20;                        │

&#x20;                        ▼

&#x20;                  USER SELECTS

&#x20;                        │

&#x20;                        ▼

&#x20;                    COOK RECIPE

&#x20;                        │

&#x20;                        ▼

&#x20;                 AVAILABILITY CHECK

&#x20;                        │

&#x20;                        ▼

&#x20;                   DEDUCT STOCK

&#x20;                        │

&#x20;                ┌───────┴────────┐

&#x20;                ▼                ▼

&#x20;         UPDATED PANTRY     COOKING\_LOG

&#x20;                │

&#x20;                ▼

&#x20;           EXPIRY CHECK

&#x20;                │

&#x20;                ▼

&#x20;           EXPIRED STOCK

&#x20;                │

&#x20;                ▼

&#x20;            WASTE\_LOG

&#x20;                │

&#x20;                ▼

&#x20;           WASTE REPORTS

37\. Complete Example

Initial Pantry

Bread       4 pieces

Paneer      250g

Onion       3 pieces

Egg         6 pieces



User:



Cooking Level: Beginner

Maximum Time: 20 minutes



User presses:



What Can I Cook?



Stage 1 — Database



SQL searches stored recipes.



Suppose:



Paneer Sandwich



is already stored and all ingredients are available.



The system displays it.



No web search is necessary.



Another Scenario



User has:



Rice        300g

Paneer      150g

Onion       1



SQL finds no suitable stored recipe.



The backend searches for a real published recipe.



Suppose it retrieves:



Paneer Rice



Rice       500g

Paneer     250g

Onion      2



Consumer rating:

4.7/5



The AI determines that proportional scaling is possible.



The recipe becomes:



Rice       300g

Paneer     150g

Onion      1



The backend checks Oracle:



Rice       300g available ✓

Paneer     150g available ✓

Onion      1 available ✓



The recipe is accepted.



It is stored in:



RECIPES

RECIPE\_INGREDIENTS



with:



source = WEB\_RETRIEVED



The user cooks it.



Oracle deducts:



Rice       300g

Paneer     150g

Onion      1



and records the cooking event.



38\. Future Recommendation



Another user later has:



Rice       500g

Paneer     250g

Onion      2



The SQL engine searches the database and finds the previously stored:



Paneer Rice



The recipe is already available in the system.



Therefore:



No new web search

No new AI retrieval

SQL recommendation



The stored recipe can be recommended directly.



39\. Final Technology Stack

Frontend

React

Vite

Tailwind CSS



Responsible for:



Login/register UI

Pantry management

Recipe recommendation screen

Recipe details

Cooking interface

Reports/dashboard

Backend

Node.js

Express.js



Responsible for:



Authentication

REST APIs

Database communication

Recipe matching requests

Web recipe retrieval

AI API integration

Recipe validation

Cooking operations

Database

Oracle Database

SQL

PL/SQL



Responsible for:



Persistent data

Relationships

Constraints

SQL queries

Recipe matching

Functions

Procedures

Triggers

Transactions

Reports

Inventory authority

Recipe Retrieval

Web / Approved Recipe Sources



Used when the database does not contain a suitable recipe.



The retrieved recipe is:



Retrieved

&#x20;   ↓

Analyzed by AI

&#x20;   ↓

Conditionally adapted

&#x20;   ↓

Validated

&#x20;   ↓

Stored in Oracle



No paid recipe API is required as a mandatory component.



40\. Final Architecture in One Sentence



The Pantry \& Recipe Management System uses an Oracle relational database as the authoritative source for pantry inventory and recipe data; SQL performs primary recipe matching, while the backend retrieves real published recipes from the web when necessary and uses AI to select and conditionally adapt those recipes to the user's available ingredients, with all resulting quantities validated against Oracle before the recipe is stored for future recommendations.

