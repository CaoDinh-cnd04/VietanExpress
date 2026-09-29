# Backend Việt An Express — image chạy trên Render (hoặc bất kỳ nơi nào chạy Docker).
# Build (từ thư mục backend/):  docker build -t vietan-api .
# Chạy thử:  docker run -p 8080:8080 -e ConnectionStrings__Default="..." -e Jwt__Secret="..." vietan-api

# ---------- Build ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Chép file cấu hình chung + csproj trước để cache bước restore khi chỉ sửa code.
COPY global.json Directory.Build.props Directory.Packages.props ./
COPY src/BuildingBlocks/VietAnExpress.SharedKernel/*.csproj src/BuildingBlocks/VietAnExpress.SharedKernel/
COPY src/Modules/Identity/VietAnExpress.Identity/*.csproj src/Modules/Identity/VietAnExpress.Identity/
COPY src/Modules/Identity/VietAnExpress.Identity.Contracts/*.csproj src/Modules/Identity/VietAnExpress.Identity.Contracts/
COPY src/Modules/Customers/VietAnExpress.Customers/*.csproj src/Modules/Customers/VietAnExpress.Customers/
COPY src/Modules/Customers/VietAnExpress.Customers.Contracts/*.csproj src/Modules/Customers/VietAnExpress.Customers.Contracts/
COPY src/Modules/Shipments/VietAnExpress.Shipments/*.csproj src/Modules/Shipments/VietAnExpress.Shipments/
COPY src/Modules/Shipments/VietAnExpress.Shipments.Contracts/*.csproj src/Modules/Shipments/VietAnExpress.Shipments.Contracts/
COPY src/VietAnExpress.API/*.csproj src/VietAnExpress.API/
RUN dotnet restore src/VietAnExpress.API/VietAnExpress.API.csproj

COPY src/ src/
RUN dotnet publish src/VietAnExpress.API/VietAnExpress.API.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# ---------- Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production \
    PORT=8080 \
    DOTNET_NOLOGO=1

COPY --from=build /app .

# Chạy bằng user không phải root (APP_UID có sẵn trong image .NET).
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "VietAnExpress.API.dll"]
