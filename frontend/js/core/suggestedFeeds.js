// Suggested feeds organized by category

var SUGGESTED_FEEDS = [
    {
        category: "Tech News",
        feeds: [
            { title: "Hacker News", url: "https://news.ycombinator.com/rss" },
            { title: "Lobste.rs", url: "https://lobste.rs/rss" },
            {
                title: "Ars Technica",
                url: "https://feeds.arstechnica.com/arstechnica/index",
            },
            { title: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
            {
                title: "The Register",
                url: "https://www.theregister.com/headlines.atom",
            },
            { title: "Wired", url: "https://www.wired.com/feed/rss" },
            {
                title: "r/technology",
                url: "https://www.reddit.com/r/technology/.rss",
            },
            {
                title: "r/programming",
                url: "https://www.reddit.com/r/programming/.rss",
            },
            { title: "r/tech", url: "https://www.reddit.com/r/tech/.rss" },
        ],
    },
    {
        category: "World News",
        feeds: [
            { title: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml" },
            { title: "CNN", url: "http://rss.cnn.com/rss/edition.rss" },
            { title: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
            { title: "The Guardian", url: "https://www.theguardian.com/world/rss" },
            { title: "NPR", url: "https://feeds.npr.org/1001/rss.xml" },
            {
                title: "NY Times",
                url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
            },
            { title: "Bloomberg", url: "https://feeds.bloomberg.com/markets/news.rss" },
            { title: "r/worldnews", url: "https://www.reddit.com/r/worldnews/.rss" },
            { title: "r/news", url: "https://www.reddit.com/r/news/.rss" },
        ],
    },
    {
        category: "Science & Culture",
        feeds: [
            {
                title: "Atlas Obscura",
                url: "https://www.atlasobscura.com/feeds/latest",
            },
            { title: "Nautilus", url: "https://nautil.us/feed/" },
            { title: "r/science", url: "https://www.reddit.com/r/science/.rss" },
            {
                title: "r/todayilearned",
                url: "https://www.reddit.com/r/todayilearned/.rss",
            },
        ],
    },
    {
        category: "Linux & Open Source",
        feeds: [
            { title: "Phoronix", url: "https://www.phoronix.com/rss.php" },
            { title: "LWN.net", url: "https://lwn.net/headlines/rss" },
            {
                title: "LWN.net Weekly Edition",
                url: "https://lwn.net/headlines/weekly",
            },
            { title: "KDE", url: "https://planet.kde.org/index.xml" },
            { title: "CNCF", url: "https://www.cncf.io/feed/" },
            { title: "Kubernetes", url: "https://kubernetes.io/feed.xml" },
            { title: "PostgreSQL", url: "https://www.postgresql.org/news.rss" },
            { title: "r/linux", url: "https://www.reddit.com/r/linux/.rss" },
            {
                title: "r/opensource",
                url: "https://www.reddit.com/r/opensource/.rss",
            },
            {
                title: "r/selfhosted",
                url: "https://www.reddit.com/r/selfhosted/.rss",
            },
            { title: "r/devops", url: "https://www.reddit.com/r/devops/.rss" },
            {
                title: "r/kubernetes",
                url: "https://www.reddit.com/r/kubernetes/.rss",
            },
            { title: "r/sysadmin", url: "https://www.reddit.com/r/sysadmin/.rss" },
        ],
    },
    {
        category: "Misc",
        feeds: [{ title: "Google News", url: "https://news.google.com/rss" }],
    },
];
