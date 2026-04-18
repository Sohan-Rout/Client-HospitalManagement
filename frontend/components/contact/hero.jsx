export default function ContactHero(){
    return(
        <main className="flex py-12 justify-between items-center">
            <div className="flex flex-col gap-4 w-lg">
                <span className="text-lg">Contact Us</span>
                <h1 className="text-6xl">
                    Get in Touch With Our Care Team
                </h1>
                <span className="text-lg">
                    Our team is ready to answer your questions, guide you through our services, and help you book your next appointment. Reach out today — we’re here to support your health journey.
                </span>
            </div>

            <div className="">
                <img className="h-92 w-118 rounded-2xl" src="/contact/hero.webp" />
            </div>
        </main>
    );
}