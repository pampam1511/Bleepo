# Welcome to Bleepo

An all-in-one women's health companion track your cycle, manage PCOS, hit your nutrition and fitness goals, and stay motivated with your community.

## About

Women managing their health — especially those living with **PCOS (Polycystic Ovary Syndrome)** — often juggle several separate apps: one for periods, one for calories, one for steps, and notes on their phone for symptoms to mention at their next appointment. The data is scattered, and it's hard to see how diet, activity and symptoms connect.

**Bleepo** brings all of this into one place. It lets users:

- **Understand their body** by logging cycles, symptoms and daily health in one timeline
- **Build healthier habits** with calorie, step and weight goals
- **Stay accountable** through challenges with friends and a supportive community
- **Get better care** by securely sharing reports with their GP or specialist

> This project was built as (a personal project / my final-year project at Kingston University) to explore full-stack mobile development with a real backend, authentication, payments and native device features.


## Screenshots
### Home 
<img width="220" height="485" alt="home" src="https://github.com/user-attachments/assets/0b037c18-0ac5-4aa4-a7ad-cef97c438364" />

### Calender 
<img width="220" height="485" alt="Simulator Screenshot - iPhone 16 - 2026-11-19 at 10 26 06" src="https://github.com/user-attachments/assets/5446dc1b-f515-4e33-ab6d-40836ac1e446" />

### Recipes
<img width="220" height="485" alt="Simulator Screenshot - iPhone 16 - 2026-11-19 at 10 28 29" src="https://github.com/user-attachments/assets/73d6d0a8-1505-4ba1-a97b-06a467a3c979" />

<img width="220" height="485" alt="Simulator Screenshot - iPhone 16 - 2026-11-19 at 10 31 30" src="https://github.com/user-attachments/assets/74853910-8926-4608-b17a-fa75ef7c8a6e" />

### Calories and weight 
<img width="220" height="485" alt="Simulator Screenshot - iPhone 16 - 2026-11-19 at 10 37 42" src="https://github.com/user-attachments/assets/ead3aeda-ec1c-4f19-a6da-00f487c9ab16" />

<img width="220" height="485" alt="Simulator Screenshot - iPhone 16 - 2026-11-19 at 10 44 06" src="https://github.com/user-attachments/assets/612c0b54-7169-4fa8-9a0b-50b76f3c59cb" />

<img width="220" height="485" alt="Simulator Screenshot - iPhone 16 - 2026-11-19 at 10 44 15" src="https://github.com/user-attachments/assets/0d48e0c3-1e7b-438f-9d0e-6d39f634eb6d" />



### Steps
<img width="220" height="485" alt="Simulator Screenshot - iPhone 16 - 2026-11-19 at 10 37 51" src="https://github.com/user-attachments/assets/9e18bd1e-6bc9-441a-963a-aed1e760400f" />

### PCOS AND PERIOD 
<img width="220" height="485" alt="Simulator Screenshot - iPhone 16 - 2026-11-19 at 10 37 26" src="https://github.com/user-attachments/assets/899461f5-e146-475b-956d-728d8069f245" />

<img width="220" height="485" alt="Simulator Screenshot - iPhone 16 - 2026-11-19 at 10 37 15" src="https://github.com/user-attachments/assets/2c2e4ecf-d1c9-44df-938d-06a0cff45969" />

---
## Features

### Cycle & PCOS Tracking
- Log period dates and notes
- Track PCOS symptoms day by day
- Daily health check-ins to spot patterns between lifestyle and symptoms
- View history to see trends over time

### Nutrition & Recipes
- Log meals and track calories against a personalised daily goal
- Browse a recipe library with ingredients and images
- Save favourite recipes for quick access

### Activity & Weight
- Daily step tracking with personal step goals
- Daily and summary views to track progress
- Weight logging alongside other health data

### Community & Challenges
- Create challenges and invite friends
- Join challenges and track group progress
- Community profiles to connect with other users

### Healthcare Provider Sharing
- Grant a healthcare provider permission to view your data
- Generate health reports to share with providers
- Users stay in control of who can see their data

### Notifications, Payments & Maps
- Push notifications for reminders and updates
- In-app payments powered by Stripe
- Google Maps integration

---

## How It Works

1. **Authentication** — users sign up and log in through Appwrite Auth; each user gets a profile.
2. **Logging** — every entry (period, symptom, meal, steps, weight) is saved in its own Appwrite collection, linked to the user.
3. **Goals & summaries** — goals are stored separately from logs, so progress is calculated by comparing daily logs to the user's goal.
4. **Social features** — challenges, members and invites are separate collections, allowing many users to join many challenges.
5. **Provider access** — a permissions collection records which provider can see which user's data.
6. **Media** — recipe images are stored in an Appwrite Storage bucket.

---
## What I Learned

- **Designing a data model for many features** — separating logs, goals and summaries kept queries simple and made new features easier to add.
- **Handling sensitive data** — thinking about permissions and consent shaped how provider sharing was built.
- **Native modules in Expo** — integrating Stripe, Maps and Notifications meant moving from Expo Go to development builds.
- **Modelling social features** — challenges, members and invites taught me how to handle many-to-many relationships in a document database.
- **Dependency management** — keeping packages aligned with the Expo SDK to avoid build errors.

---

## Roadmap

- [ ] Cycle predictions based on logged history
- [ ] Charts linking symptoms, diet and activity
- [ ] Apple Health / Google Fit integration
- [ ] Export reports as PDF
- [ ] Dark mode

---
