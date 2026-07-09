// types/global.d.ts
// ---------------------------------------------------------------------------
// Ambient declarations for globals loaded from <script> tags on the client
// (e.g. Google reCAPTCHA) and for the `Window` augmentation used by the
// Firebase / reCAPTCHA integration in app/otp/page.tsx.
// ---------------------------------------------------------------------------

interface GrecaptchaRenderOptions {
  sitekey?: string;
  callback?: (response: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  size?: 'invisible' | 'normal' | 'compact';
  tabindex?: number;
}

interface GrecaptchaRender {
  (container: string | HTMLElement, options?: GrecaptchaRenderOptions): string;
  reset(opt_widget_id?: string): void;
  getResponse(opt_widget_id?: string): string;
  execute(opt_widget_id?: string): Promise<string>;
}

interface Grecaptcha {
  render: GrecaptchaRender;
  reset: (opt_widget_id?: string) => void;
  getResponse: (opt_widget_id?: string) => string;
  execute: (opt_widget_id?: string) => Promise<string>;
  ready: (cb: () => void) => void;
}

declare const grecaptcha: Grecaptcha;
