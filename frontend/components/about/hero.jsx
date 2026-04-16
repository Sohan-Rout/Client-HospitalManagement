const image = [
    "/about/first.webp", "/about/second.webp", "/about/third.webp"
]

export default function AboutHero(){
    return(
        <main className="flex justify-between items-center h-[80vh]">
            <div className="flex flex-col gap-4 w-sm">
                <h1 className="text-4xl">
                    Our Path to Better Health and Lasting Wellness
                </h1>
                <span className="text-md">
                    We believe healthcare is more than treatment—it’s a journey toward lasting wellness. With expert care and compassionate support, we guide you every step of the way to a healthier, happier life.
                </span>
            </div>

            <div className="flex gap-4">
                {image.map((item, index) => (
                    <div key={index}>
                        <img src={item} className="rounded-2xl w-54 h-74" />
                    </div>
                ))}
            </div>
        </main>
    );
}