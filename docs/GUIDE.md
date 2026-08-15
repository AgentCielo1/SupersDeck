<!-- GENERATED from docs/guide.json by scripts/render-guide.mjs — edit the JSON, not this file -->

# SupersDeck — how to use it

Building superintendents, porters and property managers. Assumes no software background — assumes you know the building.

Each section below is a task, not a feature. Find the thing you are trying to
do and follow the steps. You do not need to read this in order, and you do not
need to read all of it.

Every step in this guide is checked automatically against the running app, so
if a screen here does not match what you see, that is a bug worth reporting —
not something you are doing wrong.

## What you can do

| task | who can do it |
|---|---|
| [Sign in for the first time](#sign-in) | Admin, Super, Manager, Porter |
| [File a work order](#file-work-order) | Admin, Super, Manager, Porter |
| [Log a heat and hot-water reading](#log-heat) | Admin, Super, Manager, Porter |
| [Add a building](#add-building) | Admin, Super, Manager |
| [Invite someone to your team](#invite-teammate) | Admin |
| [Record a contractor's visit](#contractor-visit) | Admin, Super, Manager |
| [See where you stand on compliance](#check-compliance) | Admin, Super, Manager |

## Sign in for the first time

<a id="sign-in"></a>

**Who:** Admin, Super, Manager, Porter

Everything else needs you signed in. Your account is created by whoever runs your company's SupersDeck — you cannot sign yourself up, which is deliberate: it keeps your buildings' data closed to everyone outside your organisation.

**Steps**

1. Open the app. You land on the sign-in screen.
   *Screen:* `/login` (before you sign in)
2. Enter the email address your manager used to invite you, and your password.
   *Screen:* `/login` (before you sign in)
3. You arrive at the dashboard, which greets you by time of day and shows what needs attention.
   *Screen:* `/`

## File a work order

<a id="file-work-order"></a>

**Who:** Admin, Super, Manager, Porter

The core of the day. A resident calls about no heat, a light is out, a door will not latch — this is how it gets recorded, assigned and closed, with a record you can show later.

**Steps**

1. From the dashboard, open the pending list to see everything currently outstanding.
   *Screen:* `/backlog`
2. Create a new work order. Give it the building, a short title describing the problem, and a priority.
   *Screen:* `/backlog`
3. Back on the dashboard the new ticket appears in the day's list.
   *Screen:* `/`

## Log a heat and hot-water reading

<a id="log-heat"></a>

**Who:** Admin, Super, Manager, Porter

During heat season New York City requires indoor and outdoor readings. Logging them here builds the record that answers an HPD complaint before it becomes a violation.

**Steps**

1. Open the heat log entry form.
   *Screen:* `/heat-log/new`
2. Pick the building, then enter the indoor and outdoor temperatures you measured.
   *Screen:* `/heat-log/new`
3. Check the compliance view to see the readings against what the city requires.
   *Screen:* `/heat-log/compliance`

## Add a building

<a id="add-building"></a>

**Who:** Admin, Super, Manager

Done once per property, usually at setup. Everything else — work orders, heat logs, units, tenants — hangs off a building, so this comes first.

**Steps**

1. Open the buildings list to see what is already set up.
   *Screen:* `/buildings`
2. Add a new building with its address, borough, and the number of units and floors.
   *Screen:* `/buildings/new`

## Invite someone to your team

<a id="invite-teammate"></a>

**Who:** Admin

New porter, new super, a manager who needs visibility. Only an admin can do this, and the role you choose decides what they can reach — see the permission groups in REFERENCE.md.

**Steps**

1. Open your team roster. You see everyone in your organisation.
   *Screen:* `/people`
2. Invite the new person by email and choose their role: porter, super, manager or admin.
   *Screen:* `/people/invite`

## Record a contractor's visit

<a id="contractor-visit"></a>

**Who:** Admin, Super, Manager

Who was in the building, when, and for what. This is the log you reach for after an incident, and it is what an insurer or a board asks to see.

**Steps**

1. Open the on-site logbook to see recent visits.
   *Screen:* `/contractors/logbook`
2. Contractors can also sign themselves in by scanning the QR poster at the door — print one per building.
   *Screen:* `/contractors/qr`

## See where you stand on compliance

<a id="check-compliance"></a>

**Who:** Admin, Super, Manager

The view a manager or board member asks about. What is open, what is due, and what has already been handled.

**Steps**

1. Open the compliance overview.
   *Screen:* `/compliance`

---

**Permissions.** What you can reach depends on your role. If a screen in this
guide is not there for you, your role does not include it — ask an Admin. The
full breakdown of who can do what is in [REFERENCE.md](REFERENCE.md), which is
generated from the app's own code.
