# Secret Santa Automation Script (Bash)

This is a lightweight Bash script that automates a Secret Santa gift exchange. It collects participant names, email addresses, and interests, randomly assigns recipients, and emails each participant their match — all from the command line.

The script was originally developed to run on a Linux server via SSH, where it was deployed in a real-world environment using basic Unix utilities like `mail`.

---

## Features

- Fully random pairings (no self-matches or duplicates)
- Personalized interest prompts per participant
- Automated email delivery using the `mail` command
- Runs entirely in the terminal — no UI, no dependencies
- Ideal for command-line lovers and simple server-side automation

---

## How It Works

1. Prompt user to input each participant's name and email
2. Prompt for gift budget and deadline
3. Collect a list of interests for each participant
4. Randomly assign gift recipients without repetition
5. Create and send personalized emails using the `mail` command
6. Clean up all generated files automatically

---

## Requirements

- Bash (Linux/macOS or WSL)
- A working `mail` or `sendmail` utility
- Internet access for sending emails
- SSH access if deploying on a remote server

---

## Running the Script

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/secretsanta
   cd secretsanta
   ```

2. Make the script executable:

   ```bash
   chmod +x SecretSanta.sh
   ```

3. Run the script:

   ```bash
   ./SecretSanta.sh
   ```

4. Follow the prompts to enter:
   - Names and emails of participants
   - Interests
   - Gift deadline and budget

Emails will be sent automatically to each participant.

---

## Notes

This script assumes the system's mail service is configured. If you are running locally and need email support, consider installing and configuring `mailutils` or `msmtp`.

For development or testing, use sandboxed email services like Mailtrap or Ethereal Email.

---

## License

MIT License – open to public use, contributions, and adaptation.
