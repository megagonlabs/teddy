# Teddy, the Review Explorer
Teddy (Text Exploration for Diving into Data deeplY) is an interactive system that enables data scientists to quickly obtain insights from reviews and improve their extraction and modeling pipelines.

<img src="Teddy_CHI.gif" width="900"/>

Here is a [demo video](https://drive.google.com/open?id=1bAu0FXF6t6I2ESuEFcvcYX-M6WJWi3so) as of the build on 8/23/2019.

Try our [online demo!](http://ec2-54-67-71-12.us-west-1.compute.amazonaws.com:3000/)

## Installing Teddy 
* Teddy requires Python 3.5 or above
* Make sure you have `venv` installed. If you don't, run: `python3 -m pip install virtualenv`
* Install dependencies\
`make install`
* Build dependencies\
`make build`\
(These will automatically run in a virtual environment called `venv`)

## Running Teddy 
* to start the backend server:
`make server`
* to start the front-end:
`make ui`

## Data
The default reviews provided to demonstrate the application are provided by Trip Advisor under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/legalcode) (Barkha Bansal. (2018). TripAdvisor Hotel Review Dataset. Zenodo. [http://doi.org/10.5281/zenodo.1219899](http://doi.org/10.5281/zenodo.1219899)). 

A subset of the reviews for San Francisco hotels have been selected and modified by (1) computing extractions of aspect, opinion pairs and (2) clustering and computing statistics over those clusters.

Some icons used are made by [Freepik](https://www.flaticon.com/authors/freepik) and available at [www.flaticon.com](https://www.flaticon.com).

## API Keys
Teddy requires Google API Keys to render a map. Please refer to [Google Maps Platform](https://developers.google.com/maps/documentation/embed/get-api-key) on how to get an API Key. Makefile will ask for this key during installation however you can also configure this later on by calling `make keys`

## Important folders
* `app/` server and front-end code
* `data/` subdirectories containing Trip Advisor data or your own datasets
* `libs/` python libraries for data processing
* `tests/` testing code for the code in `libs/`
