import { Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 lg:pl-64 mt-auto pb-16 lg:pb-0">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:justify-start space-x-6">
            <a href="#" className="text-neutral-500 hover:text-neutral-700" aria-label="Facebook">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" className="text-neutral-500 hover:text-neutral-700" aria-label="Twitter">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-neutral-500 hover:text-neutral-700" aria-label="Instagram">
              <Instagram className="h-5 w-5" />
            </a>
          </div>
          <div className="mt-4 md:mt-0">
            <p className="text-center text-sm text-neutral-500 md:text-right">
              &copy; {new Date().getFullYear()} Country Connect. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
