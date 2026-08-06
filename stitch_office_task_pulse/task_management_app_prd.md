# Task Management App - Product Requirements

## Overview
A web application for office task tracking and sharing across groups/departments (e.g., Accounting with subgroups like A/R, A/P, R2R).

## Core Features

### 1. Dashboard (Main Hub)
- **Greeting**: "Hello {name}! You have {x} tasks to complete today!"
- **Time Filters**: Today (default), This Week, This Month.
- **View Toggles**: "My Tasks" (default) vs "View All Tasks".
- **Filters**: Country, Brand, Team, etc.
- **Task Actions**:
    - **Mark Completed**: Turns green, stamps with user name/date/time.
    - **Mark N/A**: Turns grey, stamps with user name/date/time.
- **Alerts**: Warning for overdue tasks ("You have {x} overdue tasks").

### 2. Task Management (Admin Only)
- **Actions**: Add, reassign, delete.
- **Fields**: Description, Deadline, Group dimensions (Country, Brand, etc.).
- **Recurrence**: Weekly, Monthly (fixed date option).
- **Templates**: Select from "previously added tasks" to copy.
- **Assignment**: To Team or Person. 
- **Group Tasks**: Appear for all team members with a "Group - {TeamName}" chip.

### 3. Company Management (Admin Only)
- **Fields**: Name, Country, Brand.
- **Dynamic Dimensions**: Ability to add new dimensions (e.g., "Size" with values "Small, Medium, Large").
- **Bulk Import**: CSV template download and upload.

### 4. Teams and Members (Admin Only)
- **Teams**: Setup/remove teams (A/R, A/P, R2R).
- **Warnings**: Alert for empty teams.
- **Members**: Name, Email, Position, Team (or "No Team").

### 5. Access Levels
- **Admin**: Full access (Process Managers, Team Leaders).
- **Member**: Access to Dashboard and OOO Calendar (View only).

### 6. Out-of-Office (OOO) Calendar
- **View**: Day, Week, Month.
- **Visibility**: All members (view), Admins (edit).
- **Status Options**: In office, Remote, Out of office, Sick, Sick leave, Parental leave, Business travel.
