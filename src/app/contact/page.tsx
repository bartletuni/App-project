import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Contact TakomoCo</h1>
      <p className="text-lg text-gray-600 mb-8">
        Have questions about your custom additive manufacturing order? We're here to help!
      </p>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Email Us</h2>
        <p className="text-gray-600 mb-6">
          For all inquiries, please reach out to us at:
        </p>
        <a
          href="mailto:takomocompany@gmail.com"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:text-lg"
        >
          takomocompany@gmail.com
        </a>
      </div>

      <div className="text-left">
         <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
            &larr; Back to Dashboard
         </Link>
      </div>
    </div>
  );
}
