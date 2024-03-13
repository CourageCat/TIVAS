import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import GoogleOauthTokenStrategy  from "passport-google-oauth-token";

// Passport JWT
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken("Authorization"),
      secretOrKey: process.env.JWT_ACCESS_KEY,
    },
    (payload, done) => {
      try {
        done(null, payload);
      } catch (error) {
        console.log("Error" + error);
        done(error, false);
      }
    }
  )
);

// Passport login Google
passport.use(
  new GoogleOauthTokenStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        done(null, profile);
      } catch (error) {
        done(error, false);
      }
    }
  )
);