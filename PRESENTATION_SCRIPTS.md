# SpotN'Fix — Presentation Scripts

Short presenter scripts for key slides. Each section is **~1–1.5 minutes** at a normal speaking pace (under the 2-minute max per slide).

---

## Slide: Project Background

*About the client organization and why we chose this project.*

Good [morning/afternoon]. Our client is **Mapua University Makati**, under **Facilities Management** — an educational institution in **Brgy. Santa Cruz, Makati City**.

Before SpotN'Fix, facility issues were handled **manually**. Students filled out **physical forms** at CDMO or DOIT, maintenance checks were **inconsistent**, and many requests came through **phone calls** with no clear tracking. Compiling reports by hand also led to **delays and errors**.

That's why we chose this project — to replace that process with a **web-based system** that lets students **report issues online**, helps staff **track and manage** them, and keeps everything **organized in one place**.

In short: we built SpotN'Fix to **automate and centralize** facility reporting for Mapúa Makati.

---

## Slide 03: System Architecture and Tech Stack

SpotN'Fix uses a **three-layer architecture**.

The **Presentation Layer** is what users see — built with **HTML, CSS, and JavaScript**, designed in **Figma**. It includes the user interface, dashboards, navigation, and responsive layout for different devices.

The **Application Layer** is the backend we built with **Node.js and Express**. We use **JWT** for authentication and **Multer** for report photo uploads. This layer handles **user roles**, **search and filtering**, **report logic**, and **archiving** contact messages.

The **Data Layer** uses **MySQL** hosted on **TiDB Cloud**, with **SQL** for queries and schema design. We documented our tables, enforced **data validation**, and set up **backups** for safe recovery.

For development, we used **VS Code** and **GitHub**, **XAMPP** for local setup, **TiDB Cloud** for the database, and **Render** to deploy the live system.

---

## Slide: Challenges & Key Learnings

We faced five main challenges during development.

First, **UI design** — we needed a simple flow for search, reporting, and the admin panel. We learned to use **clear buttons** and organize facilities **by floor** so users can navigate easily.

Second, **database complexity** — adding a separate **room table** tied to floors made the schema more realistic, but also harder to maintain. We learned to **balance detail with simplicity** so the design stays usable and manageable.

Third, **authentication** — we had to enforce **Mapúa email rules** for students while keeping a **separate path for admins**. Backend validation helped us enforce those rules cleanly without breaking the user experience.

Fourth, during our second draft we hit a **serious bug** and almost lost progress. **Git and GitHub** saved us — we learned to commit often so we can always recover.

Finally, **team coordination** was a challenge. We learned to **delegate by strengths**, communicate openly, and set **clear deadlines** so everyone stayed aligned.

---

## Slide 07: Testing & Validation

*How we verified the system works correctly and reliably.*

We tested SpotN'Fix in **four ways** to make sure it works reliably — including on the backend and database side.

**Functional testing** — we ran valid and invalid scenarios for login, reporting, search, and admin actions to confirm core features work end to end.

**Input validation** — we checked empty fields, email formats, Mapúa email rules, and boundary cases so only clean data reaches the database.

**Database integrity** — we verified all **CRUD operations**: creating reports, reading and filtering data, updating statuses, and deleting records. We also confirmed **foreign keys and constraints** work so we don't get orphaned or inconsistent data.

**Independent testing** — teammates who didn't write the code tested the app blind and caught UI bugs and confusing flows we had missed.

In total we ran **25 test cases** — **22 passed** initially, **3 failed**, we **fixed those**, and reached a **100% final pass rate** before presentation.

---

## Presenter Notes

| Slide | Focus if short on time |
|-------|-------------------------|
| Project Background | Problem (manual, slow) → solution (web + tracking) |
| Architecture | Walk left → center → right through the three layers |
| Challenges | Emphasize **database** and **authentication** for backend angle |
| Testing | Be ready to name the **3 failures**: filter bug, timezone display, delete-account modal |
