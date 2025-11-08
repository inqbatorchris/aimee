import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  Bot, 
  BookOpen, 
  BarChart3, 
  Shield,
  Server,
  Check,
  ArrowRight,
  Menu,
  X,
  AlertCircle,
  Workflow,
  Zap,
  Database,
  Lightbulb
} from 'lucide-react';
import { useState } from 'react';
import logoWhite from '@assets/aimeelogowhite_1759953200944.png';

export default function MarketingLanding() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] marketing-page">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm border-b border-gray-700 bg-[#18181b]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 bg-[#18181b]">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src={logoWhite} 
                alt="Aimee.works" 
                className="h-8 w-auto"
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('problem')}
                className="text-gray-300 hover:text-white transition text-[14px] font-normal"
              >
                The Problem
              </button>
              <button 
                onClick={() => scrollToSection('solution')}
                className="text-gray-300 hover:text-white transition text-[14px] font-normal"
              >
                Solution
              </button>
              <button 
                onClick={() => scrollToSection('deployment')}
                className="text-gray-300 hover:text-white transition text-[14px] font-normal"
              >
                Deployment
              </button>
              <Button 
                onClick={() => setLocation('/login')}
                variant="default"
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 py-2 text-base font-medium"
              >
                Login
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-white transition"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#1F1F24] border-b border-gray-700">
            <div className="px-4 py-4 space-y-3">
              <button 
                onClick={() => scrollToSection('problem')}
                className="block w-full text-left text-gray-300 hover:text-white transition py-2 text-[14px] font-normal"
              >
                The Problem
              </button>
              <button 
                onClick={() => scrollToSection('solution')}
                className="block w-full text-left text-gray-300 hover:text-white transition py-2 text-[14px] font-normal"
              >
                Solution
              </button>
              <button 
                onClick={() => scrollToSection('deployment')}
                className="block w-full text-left text-gray-300 hover:text-white transition py-2 text-[14px] font-normal"
              >
                Deployment
              </button>
              <Button 
                onClick={() => setLocation('/login')}
                variant="default"
                className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-3 text-base font-medium"
              >
                Login
              </Button>
            </div>
          </div>
        )}
      </nav>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-32">
        {/* Gradient Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/20 via-transparent to-[#EC4899]/20 opacity-30" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
              <span className="text-[#8B5CF6]">AI Agents Need Structure.</span>{' '}
              We Build It For You.
            </h1>
            <p className="text-xl mb-12 max-w-3xl mx-auto text-gray-300 leading-relaxed">
              The AI revolution is here, but agents can't automate chaos. Aimee.works transforms your scattered strategy, knowledge, and workflows into the organized foundation AI needs to multiply your team's output.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => window.location.href = 'mailto:hello@aimee.works'}
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 py-6 font-medium text-base"
              >
                Book Your Demo
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#8B5CF6]" />
                <span>Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[#8B5CF6]" />
                <span>Multi-tenant SaaS architecture</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#8B5CF6]" />
                <span>Self-hosted or managed cloud</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Problem Statement Section */}
      <section id="problem" className="py-20 bg-[#18181B]/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <span className="text-[#EC4899]">AI Can't Fix Disorganization</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Before AI can help you, you need the infrastructure AI understands
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-[#18181B] border-gray-800">
              <CardHeader>
                <AlertCircle className="w-10 h-10 text-[#EC4899] mb-4" />
                <CardTitle className="text-white">Scattered Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Your strategy lives in slides. Your goals are in spreadsheets. Your progress is in emails. AI agents need structured, connected data to work with.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#18181B] border-gray-800">
              <CardHeader>
                <AlertCircle className="w-10 h-10 text-[#EC4899] mb-4" />
                <CardTitle className="text-white">Tribal Knowledge</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Critical information exists only in people's heads. AI can only work with what it can access. Without centralized knowledge, automation stalls.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#18181B] border-gray-800">
              <CardHeader>
                <AlertCircle className="w-10 h-10 text-[#EC4899] mb-4" />
                <CardTitle className="text-white">Ad-Hoc Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Every process is different every time. AI can't automate what isn't systematized. You need repeatable, documented workflows first.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Three Pillars Section */}
      <section id="solution" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              The Three Pillars of <span className="text-[#8B5CF6]">AI-Readiness</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Build the foundation AI agents need to transform your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            <Card className="bg-[#18181B] border-gray-800 hover:border-[#8B5CF6]/50 transition-all">
              <CardHeader>
                <Target className="w-12 h-12 text-[#8B5CF6] mb-4" />
                <CardTitle className="text-white text-2xl mb-2">Strategy Infrastructure</CardTitle>
                <CardDescription className="text-[#8B5CF6] font-medium mb-4">
                  AI can't execute what isn't defined
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-400 mb-4">
                  Connect vision → objectives → key results → work in one unified system
                </p>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">OKR framework implementation</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Real-time progress monitoring</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Automated check-ins and reporting</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Team alignment and accountability</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#18181B] border-gray-800 hover:border-[#8B5CF6]/50 transition-all">
              <CardHeader>
                <BookOpen className="w-12 h-12 text-[#8B5CF6] mb-4" />
                <CardTitle className="text-white text-2xl mb-2">Knowledge Foundation</CardTitle>
                <CardDescription className="text-[#8B5CF6] font-medium mb-4">
                  AI can only work with what it can access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-400 mb-4">
                  Centralized documentation with semantic search and version control
                </p>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">AI-powered semantic search</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Version control and change tracking</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Linked to strategy for context</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Role-based access control</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#18181B] border-gray-800 hover:border-[#8B5CF6]/50 transition-all">
              <CardHeader>
                <Workflow className="w-12 h-12 text-[#8B5CF6] mb-4" />
                <CardTitle className="text-white text-2xl mb-2">Operational Backbone</CardTitle>
                <CardDescription className="text-[#8B5CF6] font-medium mb-4">
                  AI can't automate what isn't systematized
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-400 mb-4">
                  Structured workflows and templates with platform integrations
                </p>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Reusable workflow templates</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Integration with existing platforms</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Offline-first field operations</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-sm">Automated workflow execution</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* How It Works Section */}
      <section className="py-20 bg-[#18181B]/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Simple 3-step journey to AI-powered operations
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#8B5CF6] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">1</span>
                </div>
                <h3 className="text-white text-xl font-semibold mb-3">Organize</h3>
                <p className="text-gray-400">
                  Map your strategy, centralize knowledge, and systematize workflows into structured data
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-[#8B5CF6] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">2</span>
                </div>
                <h3 className="text-white text-xl font-semibold mb-3">Connect</h3>
                <p className="text-gray-400">
                  Integrate with your existing platforms (Airtable, CRM, etc.) for unified data flow
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-[#8B5CF6] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">3</span>
                </div>
                <h3 className="text-white text-xl font-semibold mb-3">Automate</h3>
                <p className="text-gray-400">
                  Deploy AI agents that understand your business context and multiply your team's output
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Deployment Section */}
      <section id="deployment" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Deploy <span className="text-[#8B5CF6]">Your Way</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Complete control over your data with flexible deployment options
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-[#18181B] border-gray-800 hover:border-[#8B5CF6]/50 transition-all">
              <CardHeader>
                <Server className="w-10 h-10 text-[#8B5CF6] mb-4" />
                <CardTitle className="text-white text-2xl">Self-Hosted</CardTitle>
                <CardDescription className="text-gray-400 text-base">
                  Full control and data ownership on your infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Complete data ownership</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Deploy on your infrastructure</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Custom security policies</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Full platform access</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Support available</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-[#18181B] border-gray-800 hover:border-[#8B5CF6]/50 transition-all border-[#8B5CF6]">
              <CardHeader>
                <Zap className="w-10 h-10 text-[#8B5CF6] mb-4" />
                <CardTitle className="text-white text-2xl">Managed Implementation</CardTitle>
                <CardDescription className="text-gray-400 text-base">
                  We set it up, configure it, and train your team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Custom onboarding and configuration</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Training for your team</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Hosted version of our application</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Ongoing support and optimization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
                    <span className="text-gray-300">Automatic updates and backups</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Why Now Section */}
      <section className="py-20 bg-[#18181B]/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why <span className="text-[#8B5CF6]">Now?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <Lightbulb className="w-12 h-12 text-[#8B5CF6] mx-auto mb-4" />
              <h3 className="text-white text-xl font-semibold mb-3">AI Adoption is Accelerating</h3>
              <p className="text-gray-400">
                Organizations that wait will find themselves 12-24 months behind their competitors
              </p>
            </div>

            <div className="text-center">
              <Bot className="w-12 h-12 text-[#8B5CF6] mx-auto mb-4" />
              <h3 className="text-white text-xl font-semibold mb-3">Early Movers Win</h3>
              <p className="text-gray-400">
                The organizations winning with AI have the infrastructure in place before deploying agents
              </p>
            </div>

            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-[#8B5CF6] mx-auto mb-4" />
              <h3 className="text-white text-xl font-semibold mb-3">Costs Multiply</h3>
              <p className="text-gray-400">
                The cost of disorganization multiplies with every AI initiative you attempt without proper foundation
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section id="demo" className="py-20 bg-gradient-to-r from-[#8B5CF6]/10 to-[#EC4899]/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Don't Let AI Pass You By
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            The organizations winning with AI aren't the ones with the best models—they're the ones with the best infrastructure. Start building yours today.
          </p>
          <Button 
            size="lg" 
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-10 py-6 font-medium text-base"
            onClick={() => window.location.href = 'mailto:hello@aimee.works'}
          >
            Schedule Your Demo
            <ArrowRight className="ml-2" size={20} />
          </Button>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-[#18181B] border-t border-gray-800 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <img 
                src={logoWhite} 
                alt="Aimee.works" 
                className="h-8 w-auto mb-2"
              />
              <p className="text-gray-400">© 2025 Aimee.works. All rights reserved.</p>
            </div>
            <div className="flex space-x-8">
              <button 
                onClick={() => setLocation('/login')}
                className="text-gray-400 hover:text-white transition"
              >
                Login
              </button>
              <a href="mailto:support@aimee.works" className="text-gray-400 hover:text-white transition">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}