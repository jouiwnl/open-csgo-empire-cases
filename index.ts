import puppeteer from 'puppeteer-extra';
import puppeteerStealth from "puppeteer-extra-plugin-stealth";
import dotenv from 'dotenv';
import { Browser, ElementHandle } from 'puppeteer';
import { Page } from 'puppeteer';

import { CronJob } from 'cron';

dotenv.config();
puppeteer.use(puppeteerStealth());

var codigoFinal = "";
var pageSteam: Page;
var pageEmail: Page;

const job = new CronJob('0 0 */2 * * *', () => {
  openCase();
}, null, true, 'America/Sao_Paulo');

job.start();

async function openCase() {
  const browser = await puppeteer.launch({args: ['--no-sandbox'], headless: false});
  await logSteam(browser);
  await getCodeFromEmail(browser);
  await browser.close();
};

async function logSteam(browser: Browser) {
  pageSteam = await browser.newPage();

  pageSteam.setViewport({ width: 1280, height: 720 });

  console.log("=============== Iniciando processo de abertura de caixa ===============")

  await pageSteam.goto('https://csgoempire.com');

  const button = await pageSteam.$('[class="button-primary button-primary--green px-2"]');
  await button.evaluate(clickButton);

  console.log("Redirecionando para a página de login da steam...")

  await pageSteam.waitForNavigation();

  await pageSteam.type('[name="username"]', process.env.USER_STEAM, { delay: 5 });
  await pageSteam.type('[name="password"]', process.env.SECRET_STEAM, { delay: 5 });

  const buttonLoginSteam = await pageSteam.$('[id="imageLogin"]');
  await buttonLoginSteam.evaluate(clickButton);

  console.log("Enviando código de acesso para o e-mail correspondente...")
}

async function getCodeFromEmail(browser: Browser) {
  pageEmail = await browser.newPage();

  pageEmail.setViewport({ width: 1280, height: 720 });

  await pageEmail.goto('https://gmail.com');

  console.log("Abrindo gmail...")

  await pageEmail.type('[name="identifier"]', process.env.EMAIL_GMAIL, { delay: 5 });

  const nextButton = await pageEmail.waitForSelector('[id="identifierNext"]');
  await nextButton.evaluate(clickButton);

  await pageEmail.waitForTimeout(2000);

  await pageEmail.waitForSelector('input[type="password"]')
  await pageEmail.type('input[type="password"]', process.env.SECRET_GMAIL, { delay: 5 });
  
  const loginButton = await pageEmail.$('[id="passwordNext"]');
  await loginButton.evaluate(clickButton);

  console.log("Efetuando login no email...")

  await pageEmail.waitForNavigation();

  await pageEmail.type('[placeholder="Pesquisar e-mail"]', 'Steam');
  await pageEmail.keyboard.press('Enter');

  console.log("Resgatando emails com remetentes da steam...")

  await pageEmail.waitForTimeout(3000);

  const email = await pageEmail.$('[email="noreply@steampowered.com"]');
  await email.evaluate(clickButton);

  console.log("Email de acesso encontrado!")

  await pageEmail.waitForTimeout(1000);

  const beforeCode = await pageEmail.$(`[style="font-size:48px;line-height:52px;font-family:Arial,sans-serif,'Motiva Sans';color:#3a9aed;font-weight:bold;text-align:center"]`)
  const codigo = await beforeCode.evaluate(getValue);

  codigoFinal = codigo;

  console.log("Resgatado código de acesso: " + codigoFinal);

  pageSteam.bringToFront();

  await pageSteam.type('[id="authcode"]', codigoFinal, { delay: 5 });

  await pageSteam.waitForTimeout(2000);

  const buttonSubmit = await (await pageSteam.$('[id="auth_buttonset_entercode"]')).$('[class="auth_button leftbtn"]');
  await buttonSubmit.evaluate(clickButton);

  console.log("Provendo código recebido...");

  await pageSteam.waitForTimeout(3000);

  const buttonSuccess = await pageSteam.$('[id="success_continue_btn"]');
  await buttonSuccess.evaluate(clickButton);

  console.log("Logado com sucesso, redirecionando para o csgo empire...")

  await pageSteam.waitForNavigation();

  const buttonProfile = await pageSteam.$('[class="avatar rounded-full overflow-hidden mr-2 -mt-02"]');
  await buttonProfile.evaluate(clickButton);

  console.log("Acessando perfil...")

  await pageSteam.waitForTimeout(1500);

  const buttonsBonusCases = await pageSteam.$$('[class="flex btn-table stretch"]');
  const buttonBonus: ElementHandle = buttonsBonusCases[2];

  await buttonBonus.evaluate(clickButton);

  await pageSteam.waitForTimeout(1000);

  const buttonsOpenCases = await pageSteam.$$('[class="flex btn-primary pop"]');
  const buttonOpenCase: ElementHandle = buttonsOpenCases[1];

  if (!buttonOpenCase) {
    console.log('Ainda não é possível abrir a sua caixa!')
    return;
  }

  await buttonOpenCase.evaluate(clickButton);

  console.log("Abrindo a caixa de itens...")
  await pageSteam.waitForTimeout(10000);

  const buttonClaim = await pageSteam.$('[class="px-10 button-primary button-primary--green button-primary--large"]');
  await buttonClaim.evaluate(clickButton);

  await pageSteam.waitForTimeout(1000);

  const gunClaimed = await pageSteam.$('[class="text-center mb-4"]');
  const gunClaimedText = await gunClaimed.evaluate(getValue);

  const skinClaimed = await pageSteam.$('[class="text-light-grey-1 text-lg font-bold"]');
  const skinClaimedText = await skinClaimed.evaluate(getValue);

  console.log("A skin sorteada foi: " + gunClaimedText.concat(':').concat(skinClaimedText))

  const buttonOk = await pageSteam.$('[class="button-primary button-primary--green w-full"]');
  await buttonOk.evaluate(clickButton);

  await pageSteam.waitForTimeout(1000);
}

function clickButton(button: Element) {
  let clickable = button as HTMLElement;
  clickable.click();
}

function getValue(element: Element) {
  let formatted = element as HTMLElement;
  return formatted.innerText;
}

async function isDisabled(button: ElementHandle) {
  const clickable = await button.evaluate(b => b);

  return clickable.hasAttribute('disabled');
}