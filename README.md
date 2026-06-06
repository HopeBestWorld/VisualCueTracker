# Visual Cue Tracker

A professional-grade, privacy-first reflection tool built with React Native and Expo. The Visual Cue Tracker empowers users to map their daily actions against core values (Empathy, Growth, and Balance) while gaining deep, actionable insights through a custom, local-first AI engine.

## 🔗 Live Demo

[View the Visual Cue Tracker here](https://hopebestworld.github.io/VisualCueTracker/)

## ✨ Key Features

* **Value-Driven Tracking:** Map daily activities to specific value markers.
* **Local-First Privacy:** All data is processed on-device. No tracking, no external API keys, and no user data transmission.
* **AI-Powered Insights:** Features a custom, local semantic analyzer that cross-references your written reflections with your tracked values.
* **Actionable Coaching:** Receive tailored suggestions on how to improve your entries based on semantic gaps in your reflection.
* **Portable Data:** Export your entire journal as a human-readable `.txt` log or a structured `.json` backup.
* **Seamless Workflow:** Built with CI/CD automation via GitHub Actions for instant deployment on every push to `main`.

## 🛠️ Tech Stack

* **Framework:** React Native / Expo
* **Web:** Expo Web (Metro Bundler)
* **Storage:** AsyncStorage (Persistence)
* **AI Engine:** Custom Lexicon-based Heuristic Analyzer (Local-only inference)
* **Deployment:** GitHub Actions + GitHub Pages

## 🚀 How It Works

The AI engine runs entirely within the browser thread. It uses a **vector-keyword matching algorithm** to identify sentiment and category alignment:

1. **Keyword Stemming:** Uses RegEx-based boundary matching to detect core values even across different verb tenses.
2. **Sentiment Analysis:** Performs lightweight lexicon-based scoring to identify the emotional tone of your entries.
3. **Semantic Alignment:** Matches tracked visual cues against the semantic themes identified in your long-form text.

## 📦 Setup & Development

To run this project locally:

1. Clone the repository:
```bash
git clone https://github.com/HopeBestWorld/VisualCueTracker.git
cd VisualCueTracker

```


2. Install dependencies:
```bash
npm install

```


3. Start the development server:
```bash
npm run web

```



## 📜 Deployment

This repository is configured for automated deployment via GitHub Actions. Any push to the `main` branch will automatically trigger a build, perform path-relinking for GitHub Pages compatibility, and deploy the latest version to the live site.
