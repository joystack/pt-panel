<?php

namespace Pterodactyl\Services\MinecraftMaps;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\BadResponseException;
use GuzzleHttp\Exception\TransferException;
use Pterodactyl\Models\Server;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Ramsey\Uuid\Uuid;

enum CurseForgeSortField: int
{
    case Featured = 1;
    case Popularity = 2;
    case LastUpdated = 3;
    case Name = 4;
    case Author = 5;
    case TotalDownloads = 6;
    case Category = 7;
    case GameVersion = 8;
    case EarlyAccess = 9;
    case FeaturedReleased = 10;
    case ReleasedDate = 11;
    case Rating = 12;
};

class CurseForgeMapService extends AbstractMapService
{
    public const CURSEFORGE_MINECRAFT_GAME_ID = 432;
    public const CURSEFORGE_MINECRAFT_MAPS_CLASS_ID = 17;

    protected Client $client;

    public function __construct(private DaemonFileRepository $daemonFileRepository)
    {
        parent::__construct();

        $this->client = new Client([
            'headers' => [
                'User-Agent' => $this->userAgent,
                'X-API-Key' => config('services.curseforge_api_key'),
            ],
            'base_uri' => 'https://api.curseforge.com/v1/',
        ]);
    }

    public function search(string $query): array
    {
        try {
            $response = json_decode($this->client->get('mods/search', [
                'query' => [
                    'index' => 0,
                    'pageSize' => 50,
                    'gameId' => self::CURSEFORGE_MINECRAFT_GAME_ID,
                    'classId' => self::CURSEFORGE_MINECRAFT_MAPS_CLASS_ID,
                    'searchFilter' => $query,
                    'sortField' => CurseForgeSortField::Popularity->value,
                    'sortOrder' => 'desc',
                ],
            ])->getBody(), true);
        } catch (TransferException $e) {
            if ($e instanceof BadResponseException) {
                logger()->error('Received bad response when fetching maps.', ['response' => \GuzzleHttp\Psr7\Message::toString($e->getResponse())]);
            }

            return [];
        }

        $maps = [];

        foreach ($response['data'] as $curseforgeMap) {
            $maps[] = [
                'id' => (string) $curseforgeMap['id'],
                'name' => $curseforgeMap['name'],        
                'url' => $curseforgeMap['links']['websiteUrl'],
                'icon_url' => $curseforgeMap['logo']['thumbnailUrl'],
            ];
        }
        
        return $maps;
    }

    public function install(Server $server, string $mapId): void
    {
        try {
            $response = json_decode($this->client->get('mods/' . $mapId . '/files')->getBody(), true);
        } catch (TransferException $e) {
            if ($e instanceof BadResponseException) {
                logger()->error('Received bad response when fetching map files.', ['response' => \GuzzleHttp\Psr7\Message::toString($e->getResponse())]);
            }
        }

        $downloadUrl = str_replace("edge", "mediafiles", $response['data'][0]['downloadUrl']);
        $filename = Uuid::uuid4()->toString() . 'zip';

        $this->daemonFileRepository->setServer($server)->pull(
            $downloadUrl,
            '/',
            ['filename' => $filename, 'foreground' => true]
        );

        $this->daemonFileRepository->decompressFile('/', $filename);

        // This is fine because the previous request will already have opened the file
        // so the system won't delete the archive until the file handle is closed.
        $this->daemonFileRepository->deleteFiles('/', [$filename]);
    }
}
