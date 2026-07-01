import React from 'react';
import { Link } from 'react-router-dom';

export function Company() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060913] to-[#0b1021] text-slate-300 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Visual background glows */}
      <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[200px] right-10 w-[400px] h-[300px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Back Button */}
        <div className="flex items-center select-none shrink-0">
          <Link to="/login">
            <button className="rounded-xl font-bold flex items-center gap-2.5 border border-white/[0.06] text-slate-350 bg-white/[0.02] hover:bg-white/[0.08] hover:text-white transition-all h-10 px-5 text-xs tracking-tight shadow-sm active:scale-[0.98] cursor-pointer">
              {/* Arrow Left SVG */}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Sign In
            </button>
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-wider text-indigo-300">
            {/* Building SVG */}
            <svg className="size-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Company Verification
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Company Information
          </h1>
          <p className="text-slate-500 text-xs font-mono">Official Corporate Registry Details</p>
        </div>

        {/* Main Content Box */}
        <div className="bg-[#161b2c]/30 border border-white/[0.06] rounded-[32px] p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md space-y-10">
          
          {/* Overview Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              {/* Globe SVG */}
              <svg className="size-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Corporate Relationship
            </h2>
            <p className="text-sm leading-relaxed text-slate-350">
              ClinicFlow / CLIO is operated by <strong className="text-white">Billinsights LLC</strong>.
            </p>
            <p className="text-sm leading-relaxed text-slate-400">
              Billinsights LLC provides AI-powered administrative tools for healthcare clinics, including virtual front desk voice assistants, call routing, call intake, call summaries, and medical billing workflow automation.
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/[0.04] pt-8">
            <div className="p-5 bg-white/[0.01] border border-white/[0.04] rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                {/* Briefcase SVG */}
                <svg className="size-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Legal Entity
              </h4>
              <p className="text-sm font-semibold text-white">
                Billinsights LLC
              </p>
            </div>

            <div className="p-5 bg-white/[0.01] border border-white/[0.04] rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                {/* MapPin SVG */}
                <svg className="size-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Physical Address
              </h4>
              <p className="text-sm font-semibold text-white">
                435 E 23rd Street, Hialeah, FL 33013
              </p>
            </div>

            <div className="p-5 bg-white/[0.01] border border-white/[0.04] rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                {/* User SVG */}
                <svg className="size-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Owner & President
              </h4>
              <p className="text-sm font-semibold text-white">
                Asley Legidos Diaz
              </p>
            </div>

            <div className="p-5 bg-white/[0.01] border border-white/[0.04] rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                {/* User Check SVG */}
                <svg className="size-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Authorized Representative / Operations Contact
              </h4>
              <p className="text-sm font-semibold text-white">
                Reinier Roa Parets
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Role: Authorized Representative for ClinicFlow / CLIO operations, communications, and platform setup on behalf of Billinsights LLC.
              </p>
            </div>

            <div className="p-5 bg-white/[0.01] border border-white/[0.04] rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                {/* Mail SVG */}
                <svg className="size-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact
              </h4>
              <p className="text-sm font-semibold text-white">
                <a 
                  href="mailto:reinier@clinicflow.dev" 
                  className="text-indigo-400 hover:text-indigo-350 hover:underline transition-colors"
                >
                  reinier@clinicflow.dev
                </a>
              </p>
            </div>
          </div>

          {/* Important Notice */}
          <div className="p-5 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-3 border-t">
            <h3 className="text-md font-bold text-amber-400 flex items-center gap-2.5">
              {/* Alert SVG */}
              <svg className="size-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              IMPORTANT NOTICE
            </h3>
            <p className="text-xs leading-relaxed text-slate-350">
              ClinicFlow / CLIO is a technology platform for healthcare administrative workflows. We are not a healthcare provider and we do not provide medical advice, diagnosis, treatment, or emergency services.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.04] text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Billinsights LLC. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
