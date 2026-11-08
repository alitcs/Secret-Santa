# Little Secret

A Secret Santa organizer with a web UI for Netlify, alongside the original Bash script. Add your group, gift budget, deadline, and optional interests; the server draws names and emails each person their match. Nobody draws themselves, and the organizer does not see the matches in the UI.

## Deploy the web app to Netlify

The Bash script's `mail` command depends on a locally configured mail server and cannot send mail from a static Netlify site. The web app instead uses a Netlify Function and [Resend](https://resend.com/) to send email. You will need a Resend account and a domain you can verify for sending.

1. Connect this repository to Netlify and deploy it. `netlify.toml` sets the publish directory and functions directory; no build command or package installation is needed.
2. In Resend, verify your sending domain and create an API key with permission to send emails. Use a sender address on that verified domain. Resend's test sender has recipient restrictions and is not suitable for sending to a normal group.
3. In Netlify's **Project configuration → Environment variables**, add the following variables. If scopes are available, include **Functions**. Keep the values private; do not commit them to the repository.

   | Variable | Value |
   | --- | --- |
   | `RESEND_API_KEY` | Your Resend API key |
   | `SANTA_FROM_EMAIL` | A verified sender, for example `Little Secret <santa@example.com>` |
   | `SANTA_ACCESS_CODE` | A long, random organizer code, at least 16 characters |

4. Trigger a new deploy after setting or changing the variables. Open the deployed site, enter the organizer code in the form, and send a small test exchange to addresses you control before inviting your group.

The access code protects the email-sending endpoint from casual unauthorized use. Treat it as a password, share it only with trusted organizers, and rotate it if exposed. This app does not provide account management, rate limiting, or durable storage; for a publicly promoted deployment, add appropriate rate limiting or access controls and monitor provider usage.

### Sending and privacy

- Each draw contains 2–50 participants with distinct email addresses. Each person gets exactly one different person. The draw uses a random cycle rather than sampling every possible valid arrangement.
- Matches are generated in the function and are not returned to the browser or saved by the app. Each email includes only that person's match and that match's interests. Participant data and email content are sent to Resend for delivery, subject to its policies.
- The success message means Resend **accepted** the messages, not that they arrived. Check the Resend dashboard for delivery, bounces, and errors.
- If sending fails or the request times out, check the Resend dashboard before retrying. The result can be uncertain, and retrying generates a new draw and may send duplicate or conflicting matches. The app cannot recover a previous draw.

### Local development

The UI is static HTML, CSS, and JavaScript. For end-to-end testing, use the [Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/) and run `netlify dev` with the same environment variables configured locally. Serving `public` with a static server previews the design but does not run the email function. No participant information is sent until the form is submitted.

Run the dependency-free function tests with Node.js 20 or newer:

```sh
node --test tests/send-exchange.test.js
```

## Original Bash script

`SecretSanta.sh` remains available for Linux, macOS, or WSL with Bash, `shuf`, and a configured `mail` utility. Run `bash SecretSanta.sh` and follow its prompts. It is separate from the web app; it writes temporary text files and removes `*.txt` in the current directory, so run it in a dedicated directory without other text files.

## License

MIT License – open to public use, contributions, and adaptation.
