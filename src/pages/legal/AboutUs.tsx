import { Users } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export default function AboutUs() {
  return (
    <LegalPageLayout
      title="About Us"
      subtitle="Building the AI engine that powers social media for ambitious businesses worldwide."
      icon={<Users />}
      metaTitle="About SocioPilot — AI Social Media Automation by Offdx"
      metaDescription="SocioPilot By Offdx is an AI-powered social media automation SaaS helping businesses plan, generate, and publish content effortlessly."
    >
      <h2>Who We Are</h2>
      <p>
        <strong>SocioPilot By Offdx</strong> is an AI-powered Social Media Content Engine
        designed to help businesses, creators, and agencies run their social presence on
        autopilot. We blend strategy, creativity, and automation into a single platform
        so you can focus on growing your business while we handle the content.
      </p>

      <h2>Our Mission</h2>
      <p>
        We believe consistent, high-quality content shouldn't require a full marketing
        team. Our mission is to democratize world-class social media for every business —
        from solo entrepreneurs to multi-location brands — using cutting-edge AI.
      </p>

      <h2>What We Do</h2>
      <ul>
        <li>Generate weekly content calendars tailored to your brand voice and audience</li>
        <li>Create captions, hashtags, and visuals for Instagram, Facebook, LinkedIn, and X</li>
        <li>Automate publishing with smart scheduling across platforms</li>
        <li>Provide analytics to help you understand what's working</li>
      </ul>

      <h2>Business Information</h2>
      <ul>
        <li><strong>Business Name:</strong> Offdx (operating SocioPilot)</li>
        <li><strong>GSTIN:</strong> 19AAACO9456P1ZA</li>
        <li><strong>Registered Address:</strong> Kolkata, West Bengal, India</li>
        <li><strong>Support Email:</strong> support@sociopilot.in</li>
      </ul>

      <h2>Why Businesses Trust Us</h2>
      <p>
        SocioPilot operates on a transparent <strong>SaaS subscription model</strong> with
        monthly and annual billing. We are fully compliant with international payment
        regulations and applicable <strong>GST</strong> requirements in India. Our
        infrastructure is built on enterprise-grade cloud services to ensure your data
        stays safe and your content goes out on time, every time.
      </p>
    </LegalPageLayout>
  );
}
