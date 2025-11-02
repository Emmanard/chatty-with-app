import appJson from './app.json';
import 'dotenv/config';

export default ({ config }) => {
  return {
    ...appJson.expo, // bring all static settings from app.json
    extra: {
      ...appJson.expo.extra, // keep existing extra fields (router, eas, etc.)
      BASE_URL: process.env.BASE_URL // dynamically inject BASE_URL
    },
  };
};
