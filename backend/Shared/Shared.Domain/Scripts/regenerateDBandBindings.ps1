dotnet ef database drop -f --project Shared.Domain --startup-project api
dotnet ef migrations add InitialCreate --project Shared.Domain --startup-project api
dotnet ef database update --project Shared.Domain --startup-project api