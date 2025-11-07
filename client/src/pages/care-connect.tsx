import { ArrowRight, CheckCircle, Phone, Mail, Clock, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import caregiverImage from "@assets/AskEdith_Hero_Image.png";
import resourceListImage from "@assets/2_resource_list_1749565216801.png";
import emailPreviewImage from "@assets/3_email_preview_v2_1749566578145.png";
import emailHub1Image from "@assets/4-email-hub-1_1749565226451.png";
import emailHub2Image from "@assets/5-email-hub-2_1749565229959.png";

export default function CareConnect() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const galleryImages = [
    {
      src: resourceListImage,
      alt: "AskEdith Resource Discovery Interface",
      title: "Resource Discovery",
      description: "Browse curated care resources by category"
    },
    {
      src: emailPreviewImage,
      alt: "AskEdith Email Generation Interface",
      title: "Email Generation",
      description: "Personalized outreach made simple"
    },
    {
      src: emailHub1Image,
      alt: "AskEdith Communication Hub Overview",
      title: "Communication Hub",
      description: "Organize all your care conversations"
    },
    {
      src: emailHub2Image,
      alt: "AskEdith Conversation Detail View",
      title: "Conversation Details",
      description: "Track responses and schedule follow-ups"
    }
  ];

  const openModal = (imageIndex: number) => {
    setCurrentImageIndex(imageIndex);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Responsive Split Screen Design */}
      <section className="min-h-[500px] lg:h-[600px] mb-32 pb-16">
      <div className="flex flex-col lg:grid lg:grid-cols-2 h-full">
          {/* Left Side - Green Section with Content */}
          <div className="flex items-center justify-center p-6 md:p-8 bg-[#0B666B]/90 order-2 lg:order-1">
            <div className="w-full max-w-2xl text-white">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 md:mb-8 leading-tight">
                Why do caregivers turn to AskEdith?
              </h1>
              
              <p className="text-lg md:text-xl mb-4 md:mb-6 leading-relaxed opacity-95">
                Because caring for a loved one shouldn't mean losing yourself in a maze of resources, 
                repeating your story endlessly, or chasing scattered email replies from dozens of agencies.
              </p>
              
              <p className="text-base md:text-lg mb-6 md:mb-8 opacity-90">
                Most caregivers don't realize how exhausting this becomes—until they have spent hundreds 
                of hours on calls and emails. Time better spent with family or simply catching your breath. 
                We call it the "phone and email marathon."
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  className="w-full sm:w-auto bg-white text-teal-700 hover:bg-teal-50 font-semibold px-6 sm:px-8 py-3"
                >
                  Find Care Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side - Light Amber Background with Caregiver Image */}
          <div
            className="flex items-center justify-center h-64 sm:h-80 md:h-96 lg:h-full order-1 lg:order-2"
            style={{ backgroundColor: "#fefbed" }}
          >
            <img
              src={caregiverImage}
              alt="AskEdith Caregiver Support"
              className="w-full h-full object-contain p-4 md:p-8"
            />
          </div>
        </div>
      </section>

      {/* Main Content Section - 1,2,3,4 Format */}
      <section className="py-24 pb-24 bg-white border-t border-gray-100">
        <div className="px-[30px]">
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-12 gap-y-16">
        {/* Main Content */}
            <div className="lg:col-span-6 order-2 lg:order-1">
          
              {/* Section 1 - Problem Statement */}
              <div className="mb-16">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      1
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      The Phone and Email Marathon
                    </h2>
                    <p className="text-lg text-gray-700 leading-relaxed">
                      A marathon that depletes your energy and leaves you with more questions than answers. 
                      Caregivers spend countless hours repeating their story, navigating complex systems, 
                      and losing track of important communications across multiple agencies and providers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2 - Solution Introduction */}
              <div className="mb-16">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      2
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      AskEdith Brings You Clarity
                    </h2>
                    <p className="text-lg text-gray-700 leading-relaxed mb-6">
                      With just a few simple questions, Edith learns your needs and matches you with relevant resources. 
                      You choose who to contact. She helps you write your story once, connects it to your personal email, 
                      and sends it out for you—beautifully and efficiently.
                    </p>
                    <div className="flex items-center gap-3 text-teal-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Write your story once</span>
                    </div>
                    <div className="flex items-center gap-3 text-teal-700 mt-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Choose who to contact</span>
                    </div>
                    <div className="flex items-center gap-3 text-teal-700 mt-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Send efficiently and beautifully</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3 - Organization Benefits */}
              <div className="mb-16">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      3
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Your Care Command Center
                    </h2>
                    <p className="text-lg text-gray-700 leading-relaxed mb-6">
                      As replies stream in, AskEdith organizes everything into one easy-to-use Communication & Document Hub, 
                      seamlessly connected to your personal inbox activity. No more digging through emails, losing track of 
                      who said what or who sent what document.
                    </p>
                    <div className="bg-teal-50 border-l-4 border-teal-500 p-6 rounded-r-lg">
                      <p className="text-teal-800 font-medium">
                        Turn the outgoing and incoming chaos into an organized "care command center." 
                        So you can focus on what truly matters: caring with clarity and peace of mind.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4 - Pricing and CTA */}
              <div className="mb-16">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      4
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Simple, Affordable, No Commitments
                    </h2>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-green-700 mb-2">$9</div>
                        <div className="text-lg text-green-600 mb-4">per month</div>
                        <p className="text-gray-700">No long-term commitments required</p>
                      </div>
                    </div>
                    
                    <p className="text-lg text-gray-700 leading-relaxed mb-8">
                      Created by caregivers for caregivers. End the phone marathon. Begin with confidence.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button 
                        size="lg"
                        className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 sm:px-8 py-3"
                      >
                        Find Care Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                      <Button 
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold px-6 sm:px-8 py-3"
                      >
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t border-gray-200 pt-12">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    Questions? We're Here to Help
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center justify-center sm:justify-start gap-3 text-gray-600">
                      <Phone className="flex-shrink-0 w-5 h-5 text-teal-600" />
                      <span className="text-sm sm:text-base">1-800-ASK-EDITH</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-3 text-gray-600">
                      <Mail className="flex-shrink-0 w-5 h-5 text-teal-600" />
                      <span className="text-sm sm:text-base break-all">support@askedith.com</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-3 text-gray-600 col-span-1 sm:col-span-2 lg:col-span-1">
                      <Clock className="flex-shrink-0 w-5 h-5 text-teal-600" />
                      <span className="text-sm sm:text-base">Mon-Fri, 9AM-6PM EST</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar with Interface Previews */}
            <div className="lg:col-span-6 mb-12 lg:mb-0 lg:mt-0 order-1 lg:order-2">
              <div className="lg:sticky lg:top-8">
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">See AskEdith in Action</h3>
                  <p className="text-sm text-gray-600 mb-6">Take a look at our intuitive interface designed to simplify your caregiving journey.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    {galleryImages.map((image, index) => (
                      <div 
                        key={index} 
                        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200" 
                        onClick={() => openModal(index)}
                      >
                        <div className="aspect-video bg-gray-100 flex items-center justify-center">
                          <img
                            src={image.src}
                            alt={image.alt}
                            className="w-full h-full object-contain p-2 hover:opacity-90 transition-opacity duration-200"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-gray-700">{image.title}</p>
                          <p className="text-xs text-gray-500">{image.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Modal/Lightbox */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={closeModal}>
          <div className="relative max-w-7xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Navigation Buttons */}
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2 z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2 z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            {/* Image */}
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <img
                src={galleryImages[currentImageIndex].src}
                alt={galleryImages[currentImageIndex].alt}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              
              {/* Image Info */}
              <div className="p-6 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {galleryImages[currentImageIndex].title}
                    </h3>
                    <p className="text-gray-600">
                      {galleryImages[currentImageIndex].description}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentImageIndex + 1} of {galleryImages.length}
                  </div>
                </div>
              </div>

              {/* Thumbnail Navigation */}
              <div className="flex justify-center space-x-2 p-4 bg-gray-50">
                {galleryImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      index === currentImageIndex 
                        ? 'border-teal-500 opacity-100' 
                        : 'border-gray-300 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}