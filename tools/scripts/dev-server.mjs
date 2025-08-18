import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import yargs from 'yargs';
import boxen from 'boxen';
import { execa } from 'execa';
import { hideBin } from 'yargs/helpers';

const TAKEDA_THEME = 'takeda';
const DEFAULT_CONTENT_SOURCE = 'whitelabel';

const { theme: cliTheme } = yargs(hideBin(process.argv)).option('theme', {
  alias: 't',
  description: 'Specify the site to use',
  type: 'string',
}).argv;

const themesDirectory = path.join(process.cwd(), 'styles', 'themes');

async function proxyToAEM(theme) {
  let proxyUrl = null;
  proxyUrl = `https://main--${theme.replace('-', '')}--onetakeda.aem.page`;
  
  let siteToken = null;
  let contentResponse = await fetch(proxyUrl);

  // Handle 401 Unauthorized errors by prompting for a token
  if (contentResponse.status === 401) {
    console.log(`Authentication required for ${theme}.`);
    
    const tokenAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'token',
        message: 'Please provide an authentication token:',
        validate: (input) => input.trim() !== '' || 'Token cannot be empty'
      }
    ]);
    
    siteToken = tokenAnswer.token;
    
    // Retry the fetch with the provided token
    contentResponse = await fetch(proxyUrl, {
      headers: {
        'Authorization': `token ${siteToken}`
      }
    });
  }

  if (!contentResponse.ok) {
    console.error(`${theme} doesn't have a content source set up. Falling back to ${DEFAULT_CONTENT_SOURCE} content.`);
    proxyUrl = `https://main--${DEFAULT_CONTENT_SOURCE}--onetakeda.aem.page`;
    siteToken = null; // Reset token if we fall back to default content
  }

  const env = {
    ...process.env,
    AEM_PAGES_URL: proxyUrl,
  };

  console.log(
    boxen(`BRAND: ${theme}\nAEM PROXY: ${proxyUrl}${siteToken ? '\nUSING AUTHENTICATION: Yes' : ''}`, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
    }),
  );

  try {
    // Prepare command arguments
    const aemArgs = ['up'];
    
    // Add site-token flag if we have a token
    if (siteToken) {
      aemArgs.push('--site-token', siteToken);
    }
    
    const { stderr } = await execa('aem', aemArgs, {
      shell: true,
      env,
      stdio: 'inherit',
    });

    if (stderr) {
      console.error(stderr);
    }
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
  }
}

function getThemes() {
  return fs.readdirSync(themesDirectory).filter((file) => 
    file !== TAKEDA_THEME && fs.statSync(path.join(themesDirectory, file)).isDirectory()
  );
}

async function runLocalAEMDevServer() {
  let theme = cliTheme;

  if (!theme) {
    const themes = getThemes();

    if (themes.length === 0) {
      console.log('No themes found in the themes directory.');
      return;
    }

    const { theme: selectedTheme } = await inquirer.prompt([
      {
        type: 'list',
        name: 'theme',
        message: 'Select a site:',
        pageSize: 10,
        choices: themes,
      },
    ]);

    theme = selectedTheme;
  }

  await proxyToAEM(theme);
}

runLocalAEMDevServer();
