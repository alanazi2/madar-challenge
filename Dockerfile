# 1) بناء واجهة React
FROM node:22-alpine AS web
WORKDIR /web
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npx vite build --outDir /web/dist --emptyOutDir

# 2) بناء خادم .NET وضم الواجهة المبنية
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN rm -rf wwwroot && mkdir wwwroot
COPY --from=web /web/dist ./wwwroot
RUN dotnet publish MadarChallenge.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080 \
    MADAR_DATA_DIR=/data
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["dotnet", "MadarChallenge.dll"]
