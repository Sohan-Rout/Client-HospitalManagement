export default function ServiceHero(){
    return(
        <main className="flex justify-between items-center">
            <div className="flex flex-col gap-4 w-lg">
                <h1 className="text-4xl">
                    Trusted Healthcare Services Focused on Your Wellness and Recovery
                </h1>
                <span className="text-md">
                    At Doctera, we deliver trusted care through advanced treatments and personalized support, helping you stay well and recover with confidence.
                </span>
            </div>

            <div className="">
                <img className="h-82 w-118 rounded-2xl" src="/services/hero.webp" />
            </div>
        </main>
    );
}