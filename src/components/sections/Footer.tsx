"use client";

import { X, Globe, Code2, Camera, ArrowUp } from "lucide-react";

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 pt-24 pb-12 px-8 md:px-24 border-t border-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:col-span-1">
            <div className="text-3xl font-bold tracking-tighter text-white mb-6">
              karmakoders<span className="text-indigo-400">.ai</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
              Designing and engineering the future of the web with advanced AI and immersive 3D experiences.
            </p>
            <div className="flex gap-4">
              {[X, Globe, Code2, Camera].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-8">Navigation</h4>
            <ul className="space-y-4">
              {['Home', 'About', 'Services', 'Portfolio', 'Pricing', 'Blog', 'Careers'].map((item) => (
                <li key={item}>
                  <a href={item === 'Home' ? '/' : `/${item.toLowerCase()}`} className="text-slate-400 text-sm hover:text-indigo-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-8">Support</h4>
            <ul className="space-y-4">
              {[
                { name: 'Help Center', href: '/help-center' },
                { name: 'Terms of Service', href: '/terms' },
                { name: 'Privacy Policy', href: '/privacy' },
                { name: 'Cookie Policy', href: '/cookie-policy' },
                { name: 'Contact Support', href: '/contact-support' }
              ].map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-slate-400 text-sm hover:text-indigo-400 transition-colors">{item.name}</a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-8">Contact Info</h4>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest pt-1">Email</div>
                <div className="text-slate-400 text-sm">karmakoders@gmail.com</div>
              </li>
              <li className="flex items-start gap-4">
                <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest pt-1">Phone</div>
                <div className="text-slate-400 text-sm">7627056875</div>
              </li>
              <li className="flex items-start gap-4">
                <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest pt-1">Office</div>
                <div className="text-slate-400 text-sm">JLN marg malvinagar</div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-12 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-slate-500 text-sm text-center md:text-left">
            © {new Date().getFullYear()} karmakoders Agency. All rights reserved.
          </div>
          
          <button 
            onClick={scrollToTop}
            className="group flex items-center gap-3 text-slate-400 hover:text-white transition-colors"
          >
            <span className="text-xs font-bold uppercase tracking-widest">Back to top</span>
            <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all">
              <ArrowUp className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>
    </footer>
  );
}
