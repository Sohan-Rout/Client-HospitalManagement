const links = [
    {
        title : "Privacy & Policy",
        link : "/",
    },
    {
        title : "Cookie Policy",
        link : "/",
    },
    {
        title : "Changelog",
        link : "/",
    },
    {
        title : "Blog",
        link : "/",
    },
]

export default function Footer(){
    return(
        <main className="flex flex-col items-center-safe justify-center rounded-2xl gap-4 bg-neutral-200 py-12">
            <h1 className="text-6xl text-blue-500">
                Doctera
            </h1>
            <span className="text-2xl">
                We care for your well being
            </span>

            <ul className="flex gap-4">
                {links.map((item, index) => (
                    <li key={index}>
                        <a href={item.link}>{item.title}</a>
                    </li>
                ))}
            </ul>
        </main>
    );
}