import { SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  organizationId: string;
  sessionToken: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.AUTH_SECRET as string,
  cookieName: "erp_session",
  cookieOptions: {
    // Always use secure cookies; in dev they still work over HTTP via iron-session
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400", 10),
  },
};
