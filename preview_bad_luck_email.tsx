import { render } from "@react-email/render";
import DailyBonusEmail from "./src/emails/DailyBonusEmail";
import * as fs from "fs";
import * as React from "react";

async function main() {
  const html = await render(
    React.createElement(DailyBonusEmail, {
      name: "Ahmed Rehima",
      prize: "Bad Luck :(",
      xpAwarded: 0,
      newTotalXp: 4350
    })
  );

  fs.writeFileSync("bad_luck_email_preview.html", html);
  console.log("Preview generated at bad_luck_email_preview.html");
}
main();
