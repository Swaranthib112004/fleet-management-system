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
              <Link to="/login" className="px-6 py-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
                Sign In
              </Link>
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
            <Link to="/login" className="w-full py-4 rounded-xl bg-blue-600 text-white text-center">Sign In</Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-6">
                <Zap size={16} />
                <span>Next-gen Fleet Intelligence</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-8">
                Manage your fleet <br />
                <span className="text-blue-600">without the chaos.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 max-w-lg leading-relaxed">
                Streamline operations, optimize routes, and reduce maintenance costs with the world's most advanced logistics platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="px-8 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200 group">
                  Sign In to Dashboard
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-3xl blur-2xl"></div>
              <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1080&q=80"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
              {/* Floating Stat Card */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-50 flex items-center gap-4 animate-bounce-subtle">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <BarChart size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium leading-none mb-1">Cost Reduction</p>
                  <p className="text-2xl font-bold text-gray-900">24.8%</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">Core Capabilities</h2>
          <p className="text-4xl font-bold text-gray-900 mb-16">Everything you need to scale your logistics.</p>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              { icon: Truck, title: "Vehicle Lifecycle", desc: "Track every mile, fuel fill, and maintenance event from acquisition to disposal." },
              { icon: ShieldCheck, title: "Compliance & Safety", desc: "Automate driver license checks, insurance renewals, and safety inspections." },
              { icon: Clock, title: "Real-time Tracking", desc: "Know exactly where your assets are with GPS precision and geofencing alerts." },
              { icon: BarChart, title: "Deep Analytics", desc: "Uncover hidden costs and inefficiencies with AI-powered reporting dashboards." },
              { icon: Zap, title: "Instant Dispatch", desc: "Assign routes to drivers in seconds with our intelligent route optimization engine." },
              { icon: CheckCircle2, title: "Driver Performance", desc: "Monitor safety scores, idling time, and delivery speed to reward top performers." },
            ].map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">How it works</h2>
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
                className="relative bg-white pt-8"
              >
                <div className="w-20 h-20 rounded-full bg-blue-50 border-4 border-white shadow-sm text-blue-600 flex items-center justify-center mb-6 mx-auto relative z-10">
                  <s.icon size={32} />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                    {s.step}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2 text-center">{s.title}</h3>
                <p className="text-sm text-gray-600 text-center">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <p className="text-4xl font-bold mb-2">12k+</p>
              <p className="text-blue-100 font-medium">Vehicles Managed</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">45M</p>
              <p className="text-blue-100 font-medium">Miles Tracked</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">30%</p>
              <p className="text-blue-100 font-medium">Fuel Savings</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">99.9%</p>
              <p className="text-blue-100 font-medium">Uptime Guarantee</p>
            </div>
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
