import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { useItems } from "@/hooks/use-items"

export const Route = createFileRoute("/")({ component: App })

function App() {
	const { items, loading, error } = useItems()

	return (
		<div className="flex min-h-svh p-6">
			<div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
				<div>
					<h1 className="font-medium">Project ready!</h1>
					<p>You may now add components and start building.</p>
					<Button className="mt-2">Button</Button>
				</div>

				<div>
					<h2 className="font-medium mb-2">Items</h2>
					{loading && <p className="text-muted-foreground">Loading...</p>}
					{error && <p className="text-destructive">{error}</p>}
					{!loading && !error && items.length === 0 && (
						<p className="text-muted-foreground">No published items yet.</p>
					)}
					<ul className="flex flex-col gap-2">
						{items.map((item) => (
							<li key={item.publicId} className="rounded-lg border border-border p-3">
								<p className="font-medium">{item.title}</p>
								{item.description && (
									<p className="text-muted-foreground">{item.description}</p>
								)}
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	)
}
