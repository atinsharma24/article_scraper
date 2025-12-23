import 'dotenv/config';
import { publishOriginalArticle } from './services/laravelApi.js';
import { requireEnv } from './utils/env.js';

// Sample articles to seed the database for testing
const sampleArticles = [
	{
		type: 'original',
		title: 'How AI is Transforming Customer Support',
		slug: 'ai-transforming-customer-support',
		content: `<h1>How AI is Transforming Customer Support</h1>
<p>Artificial Intelligence is revolutionizing the way businesses interact with their customers. From chatbots to predictive analytics, AI is enabling companies to provide faster, more personalized support.</p>

<h2>Key Benefits of AI in Customer Support</h2>
<ul>
<li><strong>24/7 Availability:</strong> AI-powered chatbots can handle customer queries round the clock.</li>
<li><strong>Faster Response Times:</strong> Automated systems can instantly provide answers to common questions.</li>
<li><strong>Personalization:</strong> AI can analyze customer data to provide tailored recommendations.</li>
<li><strong>Cost Efficiency:</strong> Reducing the need for large support teams.</li>
</ul>

<h2>Real-World Applications</h2>
<p>Many companies are already leveraging AI to improve their customer support:</p>
<p>Leading e-commerce platforms use AI chatbots to handle product inquiries, track orders, and process returns. Financial institutions employ AI to detect fraud and provide instant account information.</p>

<h2>The Future of AI in Customer Support</h2>
<p>As AI technology continues to evolve, we can expect even more sophisticated applications in customer support, including emotion detection, multilingual support, and predictive issue resolution.</p>`,
		source_url: 'https://beyondchats.com/blogs/ai-transforming-customer-support',
		published_at: null,
	},
	{
		type: 'original',
		title: 'Best Practices for Live Chat Support',
		slug: 'best-practices-live-chat-support',
		content: `<h1>Best Practices for Live Chat Support</h1>
<p>Live chat has become one of the most popular customer service channels. Here are the best practices to ensure your live chat support is effective.</p>

<h2>1. Respond Quickly</h2>
<p>Customers expect immediate responses when using live chat. Aim to respond within 30 seconds to maintain customer satisfaction.</p>

<h2>2. Use Canned Responses Wisely</h2>
<p>While canned responses save time, make sure to personalize them to avoid sounding robotic. Use them as templates, not scripts.</p>

<h2>3. Train Your Team</h2>
<p>Ensure your support team is well-trained in both product knowledge and communication skills. They should be able to handle multiple chats simultaneously while maintaining quality.</p>

<h2>4. Set Clear Expectations</h2>
<p>Let customers know your chat availability hours and expected response times. This helps manage expectations and reduces frustration.</p>

<h2>5. Follow Up</h2>
<p>After resolving an issue, follow up with customers to ensure they're satisfied with the solution. This shows you care about their experience.</p>`,
		source_url: 'https://beyondchats.com/blogs/best-practices-live-chat-support',
		published_at: null,
	},
	{
		type: 'original',
		title: 'Understanding Customer Service Metrics',
		slug: 'understanding-customer-service-metrics',
		content: `<h1>Understanding Customer Service Metrics</h1>
<p>Measuring the right metrics is crucial for improving customer service. Here are the key metrics every support team should track.</p>

<h2>Response Time</h2>
<p>This measures how quickly your team responds to customer inquiries. Faster response times generally lead to higher customer satisfaction.</p>

<h2>Resolution Time</h2>
<p>The time it takes to fully resolve a customer issue. While speed is important, ensure quality isn't compromised.</p>

<h2>Customer Satisfaction (CSAT)</h2>
<p>This metric directly measures how satisfied customers are with your service. Usually measured through post-interaction surveys.</p>

<h2>First Contact Resolution (FCR)</h2>
<p>The percentage of issues resolved in the first interaction. Higher FCR rates indicate efficient support processes.</p>

<h2>Net Promoter Score (NPS)</h2>
<p>Measures customer loyalty and likelihood to recommend your service to others. A high NPS indicates strong customer relationships.</p>

<h2>Conclusion</h2>
<p>By tracking these metrics, you can identify areas for improvement and ensure your customer service team is performing at its best.</p>`,
		source_url: 'https://beyondchats.com/blogs/understanding-customer-service-metrics',
		published_at: null,
	},
];

async function main() {
	requireEnv('API_BASE_URL');

	console.log('Seeding sample articles into backend...');

	let ok = 0;
	let failed = 0;

	for (const article of sampleArticles) {
		try {
			const created = await publishOriginalArticle(article);
			ok += 1;
			console.log(`✓ Seeded: id=${created.id} title="${created.title}"`);
		} catch (err) {
			failed += 1;
			console.error(`✗ Failed: ${article.title}`);
			console.error(`  Error: ${err?.message ?? err}`);
		}
	}

	console.log(`\nDone. Seeded ${ok} articles, ${failed} failed.`);
	if (failed > 0) process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
