import { render } from "@react-email/render";
import DemonVictimEmail from "./src/emails/DemonVictimEmail";
import * as fs from "fs";
import * as React from "react";

async function main() {
  const html = await render(
    React.createElement(DemonVictimEmail, {
      name: "Ahmed Rehima",
      miniLeagueName: "Office Championship"
    })
  );

  fs.writeFileSync("demon_email_preview.html", html);
  console.log("Preview generated at demon_email_preview.html");
}
main();
