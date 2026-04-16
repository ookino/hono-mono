import { useQuery } from "@tanstack/react-query"
import { apiClient, type InferRequestType, type InferResponseType } from "@workspace/api-client"

const client = apiClient(import.meta.env.VITE_API_URL ?? "http://localhost:3001")

// Types derived directly from the typed client — no manual interface needed
type ItemsParams = InferRequestType<typeof client.items.$get>["query"]
export type ItemsData = InferResponseType<typeof client.items.$get, 200>["data"]

async function fetchItems(params: ItemsParams = {}): Promise<ItemsData> {
	const res = await client.items.$get({ query: params })

	if (!res.ok) throw new Error(`Request failed: ${res.status}`)

	const json = await res.json()
	if (!json.success) throw new Error("API error")

	return json.data
}

export function useItems(params: ItemsParams = {}) {
	return useQuery({
		queryKey: ["items", params],
		queryFn: () => fetchItems(params),
	})
}
