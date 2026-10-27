# FrenchWeb — TCF Canada Tâche 2 Practice

Interactive French conversation practice tool for TCF Canada Speaking Task 2.

## Features

- **Dialogue Studio** — Interactive conversation practice with a language center employee
- **Audio + TTS** — Listen to pronunciation (Google Translate French voice) and record your own responses
- **Strategy Annotations** — Each line tagged with OUVERTURE, ENCHAINEMENT, RÉACTION, etc. per the TCF Tâche 2 strategy
- **Progress Tracking** — Mark lines as studied, track your progress
- **Practice Mode** — Hide client answers for shadowing practice
- **Search & Filter** — Filter dialogue by keyword or annotation type

## Files

| File | Description |
|---|---|
| `FrenchWeb.html` | Main interactive web app (no dependencies, all-in-one) |
| `dialogue_annotated.txt` | Reference dialogue with strategy annotations |
| `dialogue.mp3` | TTS-generated audio of the dialogue (2:42) |

## How to Use

1. **Open** `FrenchWeb.html` in a web browser
2. **Listen** to the TTS pronunciation of each line
3. **Record** your own shadowing practice
4. **Study** the strategy annotations for each line
5. **Track** your progress with the sidebar

## TCF Tâche 2 Strategy Compliance

This dialogue follows the official TCF Canada Tâche 2 strategy:

- **10 questions** in the dialogue
- **7 enchaînements** (connector questions)
- **8 réactions** (reactions to previous answers)
- **"Si jamais"** question for contingency
- **"Donc si je résume"** recap
- **"Bonne journée"** closing

## Deployment

This is a static site — deploy to Netlify, GitHub Pages, or any static host:

```bash
# Drag FrenchWeb.html to Netlify
# Or use GitHub Pages:
# Settings → Pages → Source: main / FrenchWeb
```

## Author

Created for TCF Canada French exam preparation.