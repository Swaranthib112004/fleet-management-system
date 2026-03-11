import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Truck,
  ShieldCheck,
  BarChart,
  Clock,
  Zap,
  Menu,
  X,
  FileText,
  UserCheck,
  Wrench,
  Bell,
  LineChart
} from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // test backend connectivity on first render
  React.useEffect(() => {
    fetch('/api')
      .then(res => res.text())
      .then(text => console.log('backend says:', text))
      .catch(err => console.error('backend error', err));

    // #region agent log
    // Debug: capture basic CSS / Tailwind presence diagnostics on first render.
    fetch('http://127.0.0.1:7512/ingest/2137d9ff-2cee-4a27-9f75-e5733aef43aa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '578949'
      },
      body: JSON.stringify({
        sessionId: '578949',
        runId: 'css-debug-landing',
        hypothesisId: 'H1',
        location: 'landing-page.tsx:27',
        message: 'LandingPage mounted; CSS diagnostics',
        data: (() => {
          let testBg = '';
          try {
            const el = document.createElement('div');
            el.className = 'bg-blue-600';
            el.style.position = 'absolute';
            el.style.left = '-9999px';
            document.body.appendChild(el);
            testBg = window.getComputedStyle(el).backgroundColor;
            document.body.removeChild(el);
          } catch (e) {
            testBg = 'error:' + (e as Error).message;
          }

          let styleSheetHrefs: string[] = [];
          try {
            styleSheetHrefs = Array.from(document.styleSheets)
              .map((s) => (s.href ? String(s.href) : 'inline'))
              .slice(0, 10);
          } catch {
            styleSheetHrefs = ['error-reading-stylesheets'];
          }

          const styleTags = Array.from(
            document.querySelectorAll('style,link[rel="stylesheet"]')
          ).length;

          return {
            testBg,
            styleSheetHrefs,
            styleTags
          };
        })(),
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion agent log
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-gray-200">
                F
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                FleetPro
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
              <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
              <div className="flex items-center gap-3">
                <Link to="/login" className="px-5 py-2.5 rounded-full bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 transition-all font-bold">
                  Log in
                </Link>
                <Link to="/register" className="px-6 py-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100 font-bold">
                  Register
                </Link>
              </div>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden">
          <div className="flex flex-col gap-6 text-lg font-medium">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <hr />
            <Link to="/login" className="w-full py-4 rounded-xl border border-gray-200 text-gray-900 text-center font-bold">Log in</Link>
            <Link to="/register" className="w-full py-4 rounded-xl bg-blue-600 text-white text-center font-bold">Register</Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden min-h-[80vh] flex items-center">
        {/* Full background image with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=80"
            alt="Premium Fleet Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-sm font-semibold mb-6 border border-blue-500/30 backdrop-blur-sm">
                <Zap size={16} />
                <span>Next-gen Fleet Intelligence</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-8 drop-shadow-lg">
                Manage your fleet <br />
                <span className="text-blue-400">without the chaos.</span>
              </h1>
              <p className="text-xl text-gray-200 mb-10 max-w-lg leading-relaxed drop-shadow-md">
                Streamline operations, optimize routes, and reduce maintenance costs with the world's most advanced logistics platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="px-8 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 group">
                  Start for free
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/login" className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                  Log in
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        {/* Subtle background decoration to enhance glassmorphism */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl z-0"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl z-0"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-sm font-bold text-blue-500/90 uppercase tracking-widest mb-4 drop-shadow-sm">Core Capabilities</h2>
          <p className="text-4xl font-extrabold text-gray-900 mb-16 tracking-tight">Everything you need to manage your fleet.</p>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              { icon: Truck, title: "Vehicle Management", desc: "Easily register and track all vehicles in your fleet, including status and details." },
              { icon: FileText, title: "Document Handling", desc: "Upload and securely store vehicle documents like licenses and insurance directly in the app." },
              { icon: Zap, title: "AI Route Optimization", desc: "Generate the most efficient routes using our Generative AI assistant to save time." },
              { icon: Wrench, title: "Maintenance Logging", desc: "Record every service and repair with uploaded proofs, keeping a complete history." },
              { icon: Clock, title: "Automated Reminders", desc: "Get email alerts for upcoming maintenance and document expirations before they happen." },
              { icon: UserCheck, title: "Driver Assignment", desc: "Assign drivers to specific vehicles and manage their contact information centrally." },
            ].map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group bg-white/60 backdrop-blur-xl p-8 rounded-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:bg-white/90 hover:border-blue-100 transition-all duration-300 relative overflow-hidden"
              >
                {/* Subtle highlight effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100/50 shadow-inner text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-blue-200/50 transition-all duration-300">
                  <f.icon size={26} strokeWidth={2.5} className="drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-blue-900 transition-colors">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-bold text-blue-500/90 uppercase tracking-widest mb-4">How it works</h2>
          <p className="text-4xl font-bold text-gray-900 mb-16">Simple steps to streamline your fleet</p>

          <div className="grid lg:grid-cols-5 md:grid-cols-3 gap-6 text-left relative">
            {/* Connecting Line (hidden on small screens) */}
            <div className="hidden lg:block absolute top-12 left-[10%] w-[80%] h-0.5 bg-gray-100 -z-10"></div>

            {[
              { icon: FileText, step: "01", title: "Register Asset", desc: "Admin registers a new vehicle and uploads its documents." },
              { icon: UserCheck, step: "02", title: "Assign Driver", desc: "Admin assigns a driver to a vehicle." },
              { icon: Wrench, step: "03", title: "Log Activities", desc: "Admin logs maintenance activities." },
              { icon: Bell, step: "04", title: "Get Reminders", desc: "System sends reminders for upcoming maintenance." },
              { icon: LineChart, step: "05", title: "View Trends", desc: "Admin views maintenance trends and overall fleet status." }
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative bg-white/60 backdrop-blur-xl p-8 rounded-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:bg-white/90 hover:border-blue-100 transition-all duration-300 overflow-hidden"
              >
                {/* Subtle highlight effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100/50 shadow-inner text-blue-600 flex items-center justify-center mb-6 mx-auto relative z-10 group-hover:scale-110 group-hover:shadow-blue-200/50 transition-all duration-300">
                  <s.icon size={32} />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                    {s.step}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2 text-center text-gray-900 group-hover:text-blue-900 transition-colors">{s.title}</h3>
                <p className="text-sm text-gray-600 text-center group-hover:text-gray-700 transition-colors">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Decorative background for Stats */}
        <div className="absolute inset-0 bg-blue-600"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700/50 via-transparent to-indigo-900/50"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { val: "12k+", label: "Vehicles Managed" },
              { val: "45M", label: "Miles Tracked" },
              { val: "30%", label: "Fuel Savings" },
              { val: "99.9%", label: "Uptime Guarantee" }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <p className="text-4xl lg:text-5xl font-extrabold mb-2 drop-shadow-md">{stat.val}</p>
                <p className="text-blue-100 font-medium tracking-wide uppercase text-xs">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold shadow-lg shadow-gray-200">
                F
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                FleetPro
              </span>
            </div>
            <p>© 2026 FleetPro Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
