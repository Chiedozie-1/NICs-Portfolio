module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const body = (() => {
    if (!req.body) return {};
    if (typeof req.body === "string") {
      try {
        return Object.fromEntries(new URLSearchParams(req.body));
      } catch {
        return {};
      }
    }
    return req.body;
  })();

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (!name || !email || !subject || !message) {
    return res.status(400).send("All fields are required.");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).send("Please enter a valid email address.");
  }

  const sendTo = process.env.EMAIL_TO || "dozienkulo@gmail.com";
  const fromAddress = process.env.EMAIL_FROM || "no-reply@vercel.local";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return res
      .status(500)
      .send(
        "Email service is not configured. Add RESEND_API_KEY in Vercel settings.",
      );
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [sendTo],
        reply_to: email,
        subject,
        html: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong><br>${message.replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend error:", errorText);
      return res.status(500).send("Email service failed.");
    }

    return res.status(200).send("success");
  } catch (error) {
    console.error("Contact error:", error);
    return res.status(500).send("Server error. Please try again later.");
  }
};
