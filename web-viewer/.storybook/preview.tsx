import type { Preview } from '@storybook/nextjs'
import '../src/design/lumtact-tokens.css';
import '../src/design/lumtact.css';


const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;