import React, { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export const Providers: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [queryClient] = useState(() => new QueryClient())

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
