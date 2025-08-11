const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../database/db.supabase');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists (Supabase)
    const existingUser = await db.getUserByGoogleId(profile.id);

    if (existingUser) {
      return done(null, existingUser);
    }

    // Extract company domain from email
    const email = profile.emails[0].value;
    const domain = email.split('@')[1];
    
    // Create new user with JSON data
    const userData = {
      google_id: profile.id,
      email: email,
      name: profile.displayName,
      avatar_url: profile.photos[0]?.value,
      company_domain: domain,
      user_data: {
        profile: profile._json,
        auth_tokens: {
          access_token: accessToken,
          refresh_token: refreshToken
        }
      }
    };

    console.log("Creating user with data:", userData);
    let newUser;
    try {
      newUser = await db.createUser(userData);
      console.log("newUser created:", newUser);
    } catch (userError) {
      console.error("Error creating user:", userError);
      throw userError;
    }
    
    // Check if account company already exists for this domain
    console.log("Checking if account company exists for domain:", domain);
    const existingAccountCompany = await db.getAccountCompanyByDomain(domain);
    
    if (existingAccountCompany) {
      console.log("Account company already exists for domain:", domain);
      // Don't create a new account company, just use the existing one
    } else {
      // Create user's account company entry for LLM analysis
      console.log("Creating account company for user:", newUser.id);
      const accountCompany = await db.createAccountCompany({
        user_id: newUser.id,
        domain: domain,
        analysis_data: {} // Empty object - will be populated by LLM analysis later
      });
      console.log("Account company created:", accountCompany);
    }

    done(null, newUser);
  } catch (error) {
    console.error('Google OAuth error:', error);
    done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});